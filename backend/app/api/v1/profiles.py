from fastapi import APIRouter, HTTPException
from app.models.schemas import ProfileCreate, ProfileResponse
from app.services.neo4j_service import neo4j_service

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.post("", response_model=ProfileResponse)
async def create_or_get_profile(profile: ProfileCreate):
    """Create or get a Chrome profile."""
    try:
        profile_data = neo4j_service.get_or_create_profile(
            profile.profile_id,
            profile.profile_name
        )
        return ProfileResponse(
            profile_id=profile_data.get("profileId", profile.profile_id),
            profile_name=profile_data.get("profileName"),
            created_at=str(profile_data.get("createdAt", "")),
            last_accessed_at=str(profile_data.get("lastAccessedAt", ""))
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(profile_id: str):
    """Get profile information."""
    try:
        query = """
        MATCH (p:ChromeProfile {profileId: $profileId})
        RETURN p
        """
        result = neo4j_service.execute_query(query, {"profileId": profile_id})
        if not result:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        profile_data = dict(result[0]["p"])
        return ProfileResponse(
            profile_id=profile_data.get("profileId", profile_id),
            profile_name=profile_data.get("profileName"),
            created_at=str(profile_data.get("createdAt", "")),
            last_accessed_at=str(profile_data.get("lastAccessedAt", ""))
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

