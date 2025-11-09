"""
Conversation and Message Models

Note: These are reference models. The actual database is managed by Supabase/Lovable Cloud.
See the database schema in the Supabase migration files.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, UUID4

class ConversationBase(BaseModel):
    """Base conversation model"""
    title: str = "New Conversation"

class ConversationCreate(ConversationBase):
    """Model for creating a new conversation"""
    user_id: UUID4

class Conversation(ConversationBase):
    """Full conversation model"""
    id: UUID4
    user_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MessageBase(BaseModel):
    """Base message model"""
    role: str  # 'user', 'assistant', or 'system'
    content: str

class MessageCreate(MessageBase):
    """Model for creating a new message"""
    conversation_id: UUID4

class Message(MessageBase):
    """Full message model"""
    id: UUID4
    conversation_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True
