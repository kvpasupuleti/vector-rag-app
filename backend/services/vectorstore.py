"""
services/vectorstore.py — Vector store abstraction.

Uses Qdrant Cloud when QDRANT_URL is set,
falls back to local ChromaDB otherwise (local dev).
"""

import os
import shutil
from pathlib import Path

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
EMBED_MODEL = "text-embedding-3-small"
VECTOR_SIZE = 1536  # text-embedding-3-small output dimensions


def _is_cloud() -> bool:
    return bool(QDRANT_URL)


def _chroma_dir(module_slug: str) -> Path:
    return Path(os.getenv("DATA_DIR", "./data")) / "chroma_db" / module_slug


def _embeddings():
    from langchain_openai import OpenAIEmbeddings
    return OpenAIEmbeddings(model=EMBED_MODEL)


def _qdrant_client():
    from qdrant_client import QdrantClient
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def has_vectors(module_slug: str) -> bool:
    if _is_cloud():
        try:
            info = _qdrant_client().get_collection(module_slug)
            return (info.points_count or 0) > 0
        except Exception:
            return False
    return _chroma_dir(module_slug).exists()


def upsert_chunks(module_slug: str, chunks: list[str], metadatas: list[dict]) -> None:
    if _is_cloud():
        from qdrant_client import models
        from langchain_qdrant import QdrantVectorStore

        client = _qdrant_client()
        try:
            client.get_collection(module_slug)
        except Exception:
            client.create_collection(
                collection_name=module_slug,
                vectors_config=models.VectorParams(
                    size=VECTOR_SIZE, distance=models.Distance.COSINE
                ),
            )
        QdrantVectorStore(
            client=client, collection_name=module_slug, embedding=_embeddings()
        ).add_texts(texts=chunks, metadatas=metadatas)
    else:
        from langchain_chroma import Chroma
        Chroma(
            collection_name=module_slug,
            embedding_function=_embeddings(),
            persist_directory=str(_chroma_dir(module_slug)),
        ).add_texts(texts=chunks, metadatas=metadatas)


def get_retriever(module_slug: str, k: int = 5):
    if _is_cloud():
        from langchain_qdrant import QdrantVectorStore
        return QdrantVectorStore(
            client=_qdrant_client(),
            collection_name=module_slug,
            embedding=_embeddings(),
        ).as_retriever(search_type="similarity", search_kwargs={"k": k})
    else:
        from langchain_chroma import Chroma
        return Chroma(
            collection_name=module_slug,
            embedding_function=_embeddings(),
            persist_directory=str(_chroma_dir(module_slug)),
        ).as_retriever(search_type="similarity", search_kwargs={"k": k})


def delete_document_vectors(module_slug: str, filename: str) -> None:
    if _is_cloud():
        from qdrant_client import models
        try:
            _qdrant_client().delete(
                collection_name=module_slug,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="metadata.source",
                                match=models.MatchValue(value=filename),
                            )
                        ]
                    )
                ),
            )
        except Exception:
            pass
    else:
        from langchain_chroma import Chroma
        col_dir = _chroma_dir(module_slug)
        if not col_dir.exists():
            return
        try:
            db = Chroma(
                collection_name=module_slug,
                embedding_function=_embeddings(),
                persist_directory=str(col_dir),
            )
            existing = db.get(where={"source": filename})
            if existing["ids"]:
                db.delete(ids=existing["ids"])
        except Exception:
            pass


def delete_module_vectors(module_slug: str) -> None:
    if _is_cloud():
        try:
            _qdrant_client().delete_collection(module_slug)
        except Exception:
            pass
    else:
        col_dir = _chroma_dir(module_slug)
        if col_dir.exists():
            shutil.rmtree(col_dir)
