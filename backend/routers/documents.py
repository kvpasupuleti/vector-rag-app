from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlmodel import Session, select

from auth import require_admin
from database import get_session
from models import Document, Module
from services.ingest import ingest_document
from services.storage import delete_pdf, upload_pdf
from services.vectorstore import delete_document_vectors

router = APIRouter(tags=["documents"])


class DocumentRead(BaseModel):
    id: int
    filename: str
    status: str
    error_message: str | None
    created_at: datetime

    class Config:
        from_attributes = True


def _do_ingest(module_slug: str, filename: str, doc_id: int) -> None:
    """Background task: ingest PDF and update document status."""
    from database import engine
    from sqlmodel import Session as S

    with S(engine) as session:
        doc = session.get(Document, doc_id)
        if not doc:
            return
        try:
            ingest_document(module_slug, filename)
            doc.status = "ingested"
        except Exception as exc:
            doc.status = "error"
            doc.error_message = str(exc)
        session.add(doc)
        session.commit()


@router.get("/modules/{module_id}/documents", response_model=list[DocumentRead])
def list_documents(module_id: int, session: Annotated[Session, Depends(get_session)]):
    mod = session.get(Module, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    docs = session.exec(select(Document).where(Document.module_id == module_id)).all()
    return docs


@router.post(
    "/modules/{module_id}/upload",
    response_model=DocumentRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_document(
    module_id: int,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    session: Annotated[Session, Depends(get_session)],
    _: Annotated[None, Depends(require_admin)],
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    mod = session.get(Module, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

    content = await file.read()
    upload_pdf(mod.slug, file.filename, content)

    # Reuse existing DB record for this filename if one exists, so re-uploading
    # the same PDF updates in place rather than creating a duplicate row.
    doc = session.exec(
        select(Document).where(
            Document.module_id == module_id,
            Document.filename == file.filename,
        )
    ).first()

    if doc:
        doc.status = "pending"
        doc.error_message = None
    else:
        doc = Document(module_id=module_id, filename=file.filename, status="pending")
        session.add(doc)

    session.commit()
    session.refresh(doc)

    background_tasks.add_task(_do_ingest, mod.slug, file.filename, doc.id)
    return doc


@router.delete("/modules/{module_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    module_id: int,
    doc_id: int,
    session: Annotated[Session, Depends(get_session)],
    _: Annotated[None, Depends(require_admin)],
):
    mod = session.get(Module, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

    doc = session.get(Document, doc_id)
    if not doc or doc.module_id != module_id:
        raise HTTPException(status_code=404, detail="Document not found")

    delete_pdf(mod.slug, doc.filename)
    delete_document_vectors(mod.slug, doc.filename)
    session.delete(doc)
    session.commit()
