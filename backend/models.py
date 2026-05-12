from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Module(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(unique=True, index=True)
    description: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    module_id: int = Field(foreign_key="module.id", index=True)
    filename: str
    status: str = Field(default="pending")  # pending | ingested | error
    error_message: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    module_id: int = Field(foreign_key="module.id", index=True)
    title: str = Field(default="New Chat")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="chatsession.id", index=True)
    role: str  # "user" | "assistant"
    content: str
    sources: Optional[str] = Field(default=None)  # JSON-encoded list of filenames
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UsageLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: Optional[int] = Field(default=None, foreign_key="chatsession.id", index=True)
    module_id: Optional[int] = Field(default=None, foreign_key="module.id", index=True)
    event_type: str = Field(default="message_sent")  # message_sent
    created_at: datetime = Field(default_factory=datetime.utcnow)
