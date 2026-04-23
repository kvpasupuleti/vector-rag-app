import logging
import os
from pathlib import Path

from sqlalchemy.engine import URL
from sqlmodel import Session, SQLModel, create_engine

logger = logging.getLogger(__name__)


def _parse_pg_url(raw: str) -> URL:
    """Parse a Postgres connection string into SQLAlchemy URL.create() args.

    Handles:
    - "postgres://" vs "postgresql://" prefix
    - Passwords containing "@" (percent-encoded or raw)
    - Supabase pooler usernames containing "." (e.g. "postgres.project-ref")
    - Query params (e.g. "?sslmode=require") stripped from dbname
    """
    # Normalise scheme
    raw = raw.replace("postgres://", "postgresql://", 1)

    # Strip scheme
    scheme_end = raw.index("://") + 3
    rest = raw[scheme_end:]

    # Separate optional query string
    query = ""
    if "?" in rest:
        rest, query = rest.split("?", 1)

    # Split at the LAST "@" — everything before it is user:password
    last_at = rest.rfind("@")
    userinfo = rest[:last_at]
    hostinfo = rest[last_at + 1:]

    # Parse user:password (password may itself contain ":")
    if ":" in userinfo:
        user, password = userinfo.split(":", 1)
    else:
        user, password = userinfo, ""

    # Decode any percent-encoded chars in the password
    from urllib.parse import unquote
    password = unquote(password)

    # Parse host:port/database
    slash_idx = hostinfo.find("/")
    host_port = hostinfo[:slash_idx] if slash_idx != -1 else hostinfo
    database = hostinfo[slash_idx + 1:] if slash_idx != -1 else "postgres"

    # Split host:port at the LAST ":" (handles IPv6 addresses too)
    last_colon = host_port.rfind(":")
    if last_colon != -1:
        host = host_port[:last_colon]
        try:
            port = int(host_port[last_colon + 1:])
        except ValueError:
            host = host_port
            port = 5432
    else:
        host = host_port
        port = 5432

    return URL.create(
        "postgresql+psycopg2",
        username=user,
        password=password,
        host=host,
        port=port,
        database=database,
    )


_DATABASE_URL = os.getenv("DATABASE_URL")


def _make_engine():
    if _DATABASE_URL:
        return create_engine(_parse_pg_url(_DATABASE_URL))
    DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return create_engine(
        f"sqlite:///{DATA_DIR / 'kt_knowledge_base.db'}",
        connect_args={"check_same_thread": False},
    )


try:
    engine = _make_engine()
except Exception:
    logger.exception("FATAL: failed to initialise database engine.")
    raise


def create_db_and_tables() -> None:
    try:
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables created/verified.")
    except Exception:
        logger.exception("FATAL: failed to create database tables — check DATABASE_URL.")
        raise


def get_session():
    with Session(engine) as session:
        yield session
