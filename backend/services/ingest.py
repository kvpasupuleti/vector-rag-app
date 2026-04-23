"""
services/ingest.py — Indexes PDFs for a specific module into the vector store.
"""

import fitz  # pymupdf
from langchain.text_splitter import RecursiveCharacterTextSplitter

from services.storage import delete_module_pdfs, download_pdf
from services.vectorstore import (
    delete_document_vectors,
    delete_module_vectors,
    upsert_chunks,
)

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def _extract_text(content: bytes) -> str:
    doc = fitz.open(stream=content, filetype="pdf")
    pages = []
    for page in doc:
        text = page.get_text()
        if text.strip():
            pages.append(text)
    doc.close()
    return "\n".join(pages)


def ingest_document(module_slug: str, filename: str) -> None:
    """Download PDF from storage, chunk it, and upsert into the vector store."""
    content = download_pdf(module_slug, filename)
    text = _extract_text(content)
    if not text.strip():
        raise ValueError(f"No text extracted from {filename}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_text(text)
    metadatas = [{"source": filename, "module": module_slug} for _ in chunks]

    delete_document_vectors(module_slug, filename)
    upsert_chunks(module_slug, chunks, metadatas)


def delete_module_store(module_slug: str) -> None:
    """Wipe all vectors and PDFs for a module."""
    delete_module_vectors(module_slug)
    delete_module_pdfs(module_slug)
