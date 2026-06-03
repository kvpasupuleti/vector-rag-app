# Environment Variables

Place these in `backend/.env` (loaded automatically by `python-dotenv` in `main.py`).

## Required

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key — used for embeddings (`text-embedding-3-small`) and chat (`gpt-4o-mini`) |
| `ADMIN_KEY` | Secret string passed as `x-admin-key` header for admin-protected endpoints |

## Database (optional — defaults to SQLite)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (e.g. `postgresql://user:pass@host:5432/db`). If unset, SQLite file at `DATA_DIR/kt_knowledge_base.db` is used. |
| `DATA_DIR` | Local data directory for SQLite and ChromaDB (default: `./data`) |

## Cloud Storage — PDF files (optional — defaults to local filesystem)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL. When set, PDFs are stored in the `pdf-documents` bucket. |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (not the anon key). |

## Cloud Vector Store (optional — defaults to local ChromaDB)

| Variable | Description |
|---|---|
| `QDRANT_URL` | Qdrant Cloud cluster URL. When set, vectors are stored in Qdrant instead of local Chroma. |
| `QDRANT_API_KEY` | Qdrant API key. |

## Frontend

Set in `frontend/.env.local`:

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | Backend origin, e.g. `http://localhost:8000`. Leave empty for same-origin in production. |

---

## Local dev minimal `.env`
```
OPENAI_API_KEY=sk-...
ADMIN_KEY=your-local-admin-key
```
No other variables needed for local development — SQLite and ChromaDB are used automatically.
