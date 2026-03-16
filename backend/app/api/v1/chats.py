"""
Chat conversations API - profile-scoped saved chatbot conversations stored in Neo4j.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import ChatCreate, ChatUpdate, ChatResponse
from app.services.neo4j_service import neo4j_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profiles/{profile_id}/chats", tags=["chats"])


@router.get("", response_model=dict)
async def list_chats(profile_id: str):
    """List all chat conversations for the profile."""
    try:
        neo4j_service.get_or_create_profile(profile_id)
        chats = neo4j_service.get_chats(profile_id)
        return {"chats": chats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("", status_code=201, response_model=dict)
async def create_chat(profile_id: str, body: ChatCreate):
    """Create a new chat conversation."""
    try:
        logger.info("Creating chat: profile=%s, chat_id=%s", profile_id, body.chat_id)
        result = neo4j_service.add_chat(
            profile_id=profile_id,
            chat_id=body.chat_id,
            title=body.title,
            messages=body.messages,
        )
        return {"chatId": result.get("chat_id", body.chat_id), "chat": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(profile_id: str, chat_id: str):
    """Get a single chat conversation by id."""
    try:
        chat = neo4j_service.get_chat(profile_id, chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        return ChatResponse(**chat)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(profile_id: str, chat_id: str, body: ChatUpdate):
    """Update a chat's title and/or messages."""
    try:
        result = neo4j_service.update_chat(
            profile_id=profile_id,
            chat_id=chat_id,
            title=body.title,
            messages=body.messages,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Chat not found")
        return ChatResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.delete("/{chat_id}")
async def delete_chat(profile_id: str, chat_id: str):
    """Delete a chat conversation."""
    try:
        removed = neo4j_service.delete_chat(profile_id, chat_id)
        if not removed:
            raise HTTPException(status_code=404, detail="Chat not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
