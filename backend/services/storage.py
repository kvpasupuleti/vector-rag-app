"""
services/storage.py — PDF file storage abstraction.

Uses Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_KEY are set,
falls back to local filesystem otherwise (local dev).
"""

import os
import re
import shutil
from pathlib import Path

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BUCKET = "pdf-documents"


def _is_cloud() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


def _client():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def _safe_filename(filename: str) -> str:
    """Return a Supabase Storage-safe version of the filename.

    Supabase rejects keys containing characters like '&', '–' (en/em dash),
    and other non-ASCII symbols. We replace them with safe equivalents while
    keeping the mapping deterministic so upload/download/delete all agree.
    """
    # Normalise unicode dashes → plain hyphen
    name = filename.replace("\u2013", "-").replace("\u2014", "-")
    # Replace any character that isn't alphanumeric, space, hyphen, underscore,
    # dot, or parenthesis with an underscore.
    name = re.sub(r"[^\w\s.\-()\[\]]", "_", name)
    return name


def _object_path(module_slug: str, filename: str) -> str:
    return f"{module_slug}/{_safe_filename(filename)}"


def _local_root() -> Path:
    return Path(os.getenv("DATA_DIR", "./data")) / "modules"


def upload_pdf(module_slug: str, filename: str, content: bytes) -> None:
    if _is_cloud():
        path = _object_path(module_slug, filename)
        _client().storage.from_(BUCKET).upload(
            path,
            content,
            {"content-type": "application/pdf", "upsert": "true"},
        )
    else:
        dest = _local_root() / module_slug / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)


def download_pdf(module_slug: str, filename: str) -> bytes:
    if _is_cloud():
        return _client().storage.from_(BUCKET).download(
            _object_path(module_slug, filename)
        )
    return (_local_root() / module_slug / filename).read_bytes()


def delete_pdf(module_slug: str, filename: str) -> None:
    if _is_cloud():
        try:
            _client().storage.from_(BUCKET).remove(
                [_object_path(module_slug, filename)]
            )
        except Exception:
            pass
    else:
        path = _local_root() / module_slug / filename
        if path.exists():
            path.unlink()


def delete_module_pdfs(module_slug: str) -> None:
    if _is_cloud():
        try:
            files = _client().storage.from_(BUCKET).list(module_slug)
            paths = [f"{module_slug}/{f['name']}" for f in files]
            if paths:
                _client().storage.from_(BUCKET).remove(paths)
        except Exception:
            pass
    else:
        folder = _local_root() / module_slug
        if folder.exists():
            shutil.rmtree(folder)
