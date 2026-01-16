from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


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


class HistoryEntry(BaseModel):
    setting_key: str
    old_value: Optional[str] = None
    new_value: str
    timestamp: str
    change_type: str


class HistoryResponse(BaseModel):
    history: list[HistoryEntry]

