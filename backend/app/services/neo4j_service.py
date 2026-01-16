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
        
        # Create history entry
        self._create_history_entry(profile_id, key, value)
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
    
    def _create_history_entry(self, profile_id: str, key: str, value: Any):
        """Create a history entry for a setting change."""
        query = """
        MATCH (p:ChromeProfile {profileId: $profileId})
        CREATE (h:History {
            settingKey: $key,
            newValue: $value,
            timestamp: datetime(),
            changeType: 'UPDATE'
        })
        CREATE (p)-[:HAS_HISTORY]->(h)
        """
        self.execute_write(query, {
            "profileId": profile_id,
            "key": key,
            "value": str(value)
        })


# Global instance
neo4j_service = Neo4jService()

