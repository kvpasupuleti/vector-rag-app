import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from auth import require_admin
from database import get_session
from models import Document, Module
from services.ingest import delete_module_store

router = APIRouter(tags=["modules"])


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


class ModuleCreate(BaseModel):
    name: str
    description: str = ""


class ModuleRead(BaseModel):
    id: int
    name: str
    slug: str
    description: str
    document_count: int = 0

    class Config:
        from_attributes = True


@router.get("/modules", response_model=list[ModuleRead])
def list_modules(session: Annotated[Session, Depends(get_session)]):
    modules = session.exec(select(Module)).all()
    result = []
    for mod in modules:
        count = len(session.exec(select(Document).where(Document.module_id == mod.id)).all())
        result.append(
            ModuleRead(
                id=mod.id,
                name=mod.name,
                slug=mod.slug,
                description=mod.description,
                document_count=count,
            )
        )
    return result


@router.get("/modules/{module_id}", response_model=ModuleRead)
def get_module(module_id: int, session: Annotated[Session, Depends(get_session)]):
    mod = session.get(Module, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    count = len(session.exec(select(Document).where(Document.module_id == mod.id)).all())
    return ModuleRead(
        id=mod.id,
        name=mod.name,
        slug=mod.slug,
        description=mod.description,
        document_count=count,
    )


@router.post("/modules", response_model=ModuleRead, status_code=status.HTTP_201_CREATED)
def create_module(
    body: ModuleCreate,
    session: Annotated[Session, Depends(get_session)],
    _: Annotated[None, Depends(require_admin)],
):
    slug = _slugify(body.name)
    existing = session.exec(select(Module).where(Module.slug == slug)).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Module with slug '{slug}' already exists.")

    mod = Module(name=body.name, slug=slug, description=body.description)
    session.add(mod)
    session.commit()
    session.refresh(mod)
    return ModuleRead(id=mod.id, name=mod.name, slug=mod.slug, description=mod.description, document_count=0)


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    module_id: int,
    session: Annotated[Session, Depends(get_session)],
    _: Annotated[None, Depends(require_admin)],
):
    mod = session.get(Module, module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

    docs = session.exec(select(Document).where(Document.module_id == module_id)).all()
    for doc in docs:
        session.delete(doc)

    delete_module_store(mod.slug)
    session.delete(mod)
    session.commit()
