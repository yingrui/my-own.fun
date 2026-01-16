from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    SettingUpdate,
    SettingsBulkUpdate,
    SettingResponse,
    SettingsResponse
)
from app.services.neo4j_service import neo4j_service

router = APIRouter(prefix="/profiles/{profile_id}/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_all_settings(profile_id: str):
    """Get all settings for a profile."""
    try:
        # Ensure profile exists
        neo4j_service.get_or_create_profile(profile_id)
        
        settings = neo4j_service.get_profile_settings(profile_id)
        return SettingsResponse(settings=settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{key}", response_model=SettingResponse)
async def get_setting(profile_id: str, key: str):
    """Get a specific setting."""
    try:
        query = """
        MATCH (p:ChromeProfile {profileId: $profileId})-[:HAS_SETTING]->(s:Setting {key: $key})
        RETURN s.key as key, s.value as value, s.category as category, s.updatedAt as updatedAt
        """
        result = neo4j_service.execute_query(query, {
            "profileId": profile_id,
            "key": key
        })
        
        if not result:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        item = result[0]
        return SettingResponse(
            key=item["key"],
            value=item["value"],
            category=item["category"],
            updated_at=str(item.get("updatedAt", ""))
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{key}", response_model=SettingResponse)
async def update_setting(profile_id: str, key: str, setting: SettingUpdate):
    """Update a specific setting."""
    try:
        # Ensure profile exists
        neo4j_service.get_or_create_profile(profile_id)
        
        success = neo4j_service.set_profile_setting(
            profile_id,
            key,
            setting.value,
            setting.category
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update setting")
        
        # Get updated setting to return with timestamp
        query = """
        MATCH (p:ChromeProfile {profileId: $profileId})-[:HAS_SETTING]->(s:Setting {key: $key})
        RETURN s.updatedAt as updatedAt
        """
        result = neo4j_service.execute_query(query, {
            "profileId": profile_id,
            "key": key
        })
        
        updated_at = ""
        if result:
            updated_at = str(result[0].get("updatedAt", ""))
        
        return SettingResponse(
            key=key,
            value=setting.value,
            category=setting.category,
            updated_at=updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=SettingsResponse)
async def bulk_update_settings(profile_id: str, bulk_update: SettingsBulkUpdate):
    """Bulk update settings."""
    try:
        # Ensure profile exists
        neo4j_service.get_or_create_profile(profile_id)
        
        success = neo4j_service.bulk_update_settings(
            profile_id,
            bulk_update.settings,
            bulk_update.category
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update settings")
        
        # Return updated settings
        settings = neo4j_service.get_profile_settings(profile_id)
        return SettingsResponse(settings=settings)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{key}")
async def delete_setting(profile_id: str, key: str):
    """Delete a setting."""
    try:
        query = """
        MATCH (p:ChromeProfile {profileId: $profileId})-[:HAS_SETTING]->(s:Setting {key: $key})
        DETACH DELETE s
        RETURN count(s) as deleted
        """
        result = neo4j_service.execute_write(query, {
            "profileId": profile_id,
            "key": key
        })
        
        if not result or result[0].get("deleted", 0) == 0:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        return {"message": "Setting deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

