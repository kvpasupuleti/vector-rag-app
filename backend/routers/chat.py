import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from database import engine, get_session
from models import ChatMessage, ChatSession, Module
from services.rag import stream_answer_question

router = APIRouter(tags=["chat"])


class ChatStreamRequest(BaseModel):
    question: str


class SessionResponse(BaseModel):
    id: int
    module_id: int
    title: str
    created_at: str


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: list[str]
    created_at: str


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/modules/{module_id}/sessions", response_model=list[SessionResponse])
def list_sessions(
    module_id: int,
    db: Annotated[Session, Depends(get_session)],
):
    mod = db.get(Module, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    sessions = db.exec(
        select(ChatSession)
        .where(ChatSession.module_id == module_id)
        .order_by(ChatSession.created_at.desc())
    ).all()
    return [
        SessionResponse(
            id=s.id,
            module_id=s.module_id,
            title=s.title,
            created_at=s.created_at.isoformat(),
        )
        for s in sessions
    ]


@router.post("/modules/{module_id}/sessions", response_model=SessionResponse)
def create_session(
    module_id: int,
    db: Annotated[Session, Depends(get_session)],
):
    mod = db.get(Module, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    session = ChatSession(module_id=module_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionResponse(
        id=session.id,
        module_id=session.module_id,
        title=session.title,
        created_at=session.created_at.isoformat(),
    )


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: Annotated[Session, Depends(get_session)],
):
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.exec(
        select(ChatMessage).where(ChatMessage.session_id == session_id)
    ).all()
    for msg in messages:
        db.delete(msg)
    db.delete(session)
    db.commit()


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
def get_messages(
    session_id: int,
    db: Annotated[Session, Depends(get_session)],
):
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.exec(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    ).all()
    return [
        MessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            sources=json.loads(m.sources) if m.sources else [],
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]


# ── Streaming Chat ─────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/chat/stream")
async def chat_stream(session_id: int, body: ChatStreamRequest):
    async def generate():
        with Session(engine) as db:
            chat_session = db.get(ChatSession, session_id)
            if not chat_session:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Session not found'})}\n\n"
                return

            mod = db.get(Module, chat_session.module_id)

            if chat_session.title == "New Chat":
                chat_session.title = body.question[:50].strip()
                db.add(chat_session)

            user_msg = ChatMessage(
                session_id=session_id,
                role="user",
                content=body.question,
            )
            db.add(user_msg)
            db.commit()

            prior = db.exec(
                select(ChatMessage)
                .where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at)
            ).all()
            # Exclude the user message just saved (last item)
            history = [{"role": m.role, "content": m.content} for m in prior[:-1]]

            full_response = ""
            captured_sources: list[str] = []

            async for event in stream_answer_question(mod.slug, body.question, history):
                yield f"data: {json.dumps(event)}\n\n"
                if event["type"] == "token":
                    full_response += event["token"]
                elif event["type"] == "sources":
                    captured_sources = event["sources"]

            assistant_msg = ChatMessage(
                session_id=session_id,
                role="assistant",
                content=full_response,
                sources=json.dumps(captured_sources),
            )
            db.add(assistant_msg)
            db.commit()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
