from pydantic import BaseModel
from typing import Optional, Dict, Any, List


class ProfileCreate(BaseModel):
    profile_id: str
    profile_name: Optional[str] = None


class ProfileResponse(BaseModel):
    profile_id: str
    profile_name: Optional[str] = None
    created_at: Optional[str] = None
    last_accessed_at: Optional[str] = None


class SettingUpdate(BaseModel):
    key: str
    value: Any
    category: str


class SettingsBulkUpdate(BaseModel):
    settings: Dict[str, Any]
    category: str


class SettingResponse(BaseModel):
    key: str
    value: Any
    category: str
    updated_at: Optional[str] = None


class SettingsResponse(BaseModel):
    settings: Dict[str, Any]


class DocumentLibraryAdd(BaseModel):
    file_hash: str
    filename: str = ""
    extracted_at: int = 0
    block_count: int = 0


class ChatCreate(BaseModel):
    chat_id: str
    title: str = "New chat"
    messages: List[Dict[str, Any]] = []


class ChatUpdate(BaseModel):
    title: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None


class ChatResponse(BaseModel):
    chat_id: str
    title: str
    messages: List[Dict[str, Any]]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

