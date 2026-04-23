"""
services/rag.py — RAG query pipeline scoped to a module.
"""

import asyncio
from typing import AsyncGenerator

from langchain.schema import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from services.vectorstore import get_retriever, has_vectors

LLM_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = """You are a helpful assistant that answers questions based strictly on the provided document excerpts.

Rules:
- Answer only from the context provided. Do not use outside knowledge.
- If the context does not contain enough information to answer, say so clearly.
- Be concise and direct. Use bullet points or numbered lists where appropriate.
- When relevant, mention which document the information came from.
"""


def _build_context(docs) -> tuple[str, list[str]]:
    parts = []
    sources = []
    for doc in docs:
        source = doc.metadata.get("source", "unknown")
        if source not in sources:
            sources.append(source)
        parts.append(f"[Source: {source}]\n{doc.page_content}")
    return "\n\n---\n\n".join(parts), sources


def _build_messages(context: str, question: str, history: list[dict]) -> list:
    messages = [SystemMessage(content=SYSTEM_PROMPT)]
    for turn in history[-6:]:
        if turn["role"] == "user":
            messages.append(HumanMessage(content=turn["content"]))
        else:
            messages.append(AIMessage(content=turn["content"]))
    messages.append(
        HumanMessage(content=f"Context from documents:\n\n{context}\n\nQuestion: {question}")
    )
    return messages


async def stream_answer_question(
    module_slug: str,
    question: str,
    history: list[dict],
) -> AsyncGenerator[dict, None]:
    """Async generator yielding SSE event dicts: sources → tokens → done."""
    if not has_vectors(module_slug):
        yield {
            "type": "error",
            "message": "This module has no indexed documents yet. Please upload and ingest PDFs first.",
        }
        return

    loop = asyncio.get_event_loop()
    retriever = get_retriever(module_slug)
    relevant_docs = await loop.run_in_executor(None, retriever.invoke, question)
    context, sources = _build_context(relevant_docs)

    yield {"type": "sources", "sources": sources}

    messages = _build_messages(context, question, history)
    llm = ChatOpenAI(model=LLM_MODEL, temperature=0)

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield {"type": "token", "token": chunk.content}

    yield {"type": "done"}
