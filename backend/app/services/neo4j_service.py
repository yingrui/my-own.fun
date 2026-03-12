from neo4j import GraphDatabase
from typing import Optional, Dict, Any, List
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class Neo4jService:
    """Service for managing Neo4j database connections and operations."""
    
    def __init__(self):
        self.driver = None
        self._connect()
    
    def _connect(self):
        """Establish connection to Neo4j database."""
        try:
            self.driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password)
            )
            # Verify connectivity
            self.driver.verify_connectivity()
            logger.info("Connected to Neo4j database")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise
    
    def close(self):
        """Close the database connection."""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")
    
    def execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Execute a Cypher query and return results."""
        if parameters is None:
            parameters = {}
        
        with self.driver.session(database=settings.neo4j_database) as session:
            result = session.run(query, parameters)
            return [record.data() for record in result]
    
    def execute_write(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Execute a write transaction."""
        if parameters is None:
            parameters = {}
        
        with self.driver.session(database=settings.neo4j_database) as session:
            result = session.execute_write(
                lambda tx: list(tx.run(query, parameters))
            )
            return [record.data() for record in result]
    
    def get_or_create_profile(self, profile_id: str, profile_name: Optional[str] = None) -> Dict[str, Any]:
        """Get or create a Chrome profile node."""
        query = """
        MERGE (p:ChromeProfile {profileId: $profileId})
        ON CREATE SET 
            p.createdAt = datetime(),
            p.lastAccessedAt = datetime(),
            p.profileName = $profileName
        ON MATCH SET 
            p.lastAccessedAt = datetime(),
            p.profileName = COALESCE($profileName, p.profileName)
        RETURN p
        """
        result = self.execute_write(query, {
            "profileId": profile_id,
            "profileName": profile_name or profile_id
        })
        if result:
            return dict(result[0]["p"])
        return {}
    
    def get_profile_settings(self, profile_id: str) -> Dict[str, Any]:
        """Get all settings for a profile."""
        query = """
        MATCH (p:ChromeProfile {profileId: $profileId})-[:HAS_SETTING]->(s:Setting)
        RETURN s.key as key, s.value as value, s.category as category, s.updatedAt as updatedAt
        """
        results = self.execute_query(query, {"profileId": profile_id})
        return {item["key"]: item["value"] for item in results}
    
    def set_profile_setting(self, profile_id: str, key: str, value: Any, category: str) -> bool:
        """Set a setting for a profile."""
        query = """
        MATCH (p:ChromeProfile {profileId: $profileId})
        MERGE (p)-[:HAS_SETTING]->(s:Setting {key: $key})
        SET s.value = $value, s.category = $category, s.updatedAt = datetime()
        WITH p, s
        MERGE (c:Category {name: $category})
        MERGE (s)-[:BELONGS_TO]->(c)
        RETURN s
        """
        result = self.execute_write(query, {
            "profileId": profile_id,
            "key": key,
            "value": str(value),
            "category": category
        })
        return len(result) > 0
    
    def bulk_update_settings(self, profile_id: str, settings: Dict[str, Any], category: str) -> bool:
        """Bulk update settings for a profile."""
        query = """
        MATCH (p:ChromeProfile {profileId: $profileId})
        UNWIND $settings as setting
        MERGE (p)-[:HAS_SETTING]->(s:Setting {key: setting.key})
        SET s.value = setting.value, s.category = $category, s.updatedAt = datetime()
        WITH s, $category as cat
        MERGE (c:Category {name: cat})
        MERGE (s)-[:BELONGS_TO]->(c)
        """
        settings_list = [{"key": k, "value": str(v)} for k, v in settings.items()]
        result = self.execute_write(query, {
            "profileId": profile_id,
            "settings": settings_list,
            "category": category
        })
        return True
    
    def add_document_to_library(
        self,
        profile_id: str,
        file_hash: str,
        filename: str,
        extracted_at: int,
        block_count: int = 0,
    ) -> Dict[str, Any]:
        """
        Add a document to the profile's library.
        Duplicate = same (filename, fileHash) for this profile. Same sha256 with different
        filename is allowed (e.g. copy of file); only exact match on both prevents re-add.
        """
        self.get_or_create_profile(profile_id)
        query = """
        MATCH (p:ChromeProfile {profileId: $profileId})
        MERGE (p)-[:HAS_DOCUMENT]->(d:Document {fileHash: $fileHash, filename: $filename})
        ON CREATE SET d.extractedAt = $extractedAt, d.blockCount = $blockCount
        ON MATCH SET d.extractedAt = $extractedAt, d.blockCount = $blockCount
        RETURN d.fileHash as fileHash, d.filename as filename, d.extractedAt as extractedAt, d.blockCount as blockCount
        """
        result = self.execute_write(query, {
            "profileId": profile_id,
            "fileHash": file_hash,
            "filename": filename,
            "extractedAt": extracted_at,
            "blockCount": block_count,
        })
        if result:
            r = result[0]
            return {
                "fileHash": r["fileHash"],
                "filename": r["filename"],
                "extractedAt": r["extractedAt"],
                "blockCount": r.get("blockCount", 0),
            }
        return {}

    def get_document_library(self, profile_id: str) -> List[Dict[str, Any]]:
        """Get all documents in the profile's library."""
        query = """
        MATCH (p:ChromeProfile {profileId: $profileId})-[:HAS_DOCUMENT]->(d:Document)
        RETURN d.fileHash as fileHash, d.filename as filename, d.extractedAt as extractedAt, d.blockCount as blockCount
        ORDER BY d.extractedAt DESC
        """
        rows = self.execute_query(query, {"profileId": profile_id})
        return [dict(row) for row in rows]

    def remove_document_from_library(
        self, profile_id: str, file_hash: str, filename: Optional[str] = None
    ) -> bool:
        """Remove a document from the profile's library by fileHash and optionally filename."""
        params: Dict[str, Any] = {"profileId": profile_id, "fileHash": file_hash}
        if filename is not None:
            params["filename"] = filename
            query = """
            MATCH (p:ChromeProfile {profileId: $profileId})-[r:HAS_DOCUMENT]->(d:Document {fileHash: $fileHash, filename: $filename})
            DELETE r, d
            RETURN count(d) as deleted
            """
        else:
            query = """
            MATCH (p:ChromeProfile {profileId: $profileId})-[r:HAS_DOCUMENT]->(d:Document {fileHash: $fileHash})
            DELETE r, d
            RETURN count(d) as deleted
            """
        result = self.execute_write(query, params)
        return result and result[0].get("deleted", 0) > 0


# Global instance
neo4j_service = Neo4jService()

