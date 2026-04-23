# RAG Knowledge Base

A full-stack knowledge base web app for team knowledge-sharing and self-learning. Upload PDFs into topic modules, then ask questions — answers are grounded strictly in your documents.

**Stack:** FastAPI · SQLModel · ChromaDB / Qdrant · OpenAI (gpt-4o-mini) · React · Vite · Tailwind CSS

---

## Features

- **Modules** — organize documents by topic (e.g. "Login Flow", "Test Module", "Live Classes")
- **PDF upload via UI** — drag-and-drop upload, background indexing with status tracking
- **Per-module chat** — RAG-powered Q&A scoped to a module's documents, with streaming responses
- **Admin panel** — create/delete modules, upload/remove documents, protected by an admin key
- **No login required for viewers** — teammates just open the URL and start asking questions

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Create a .env file at the project root (rag-application/.env) with:
# OPENAI_API_KEY=sk-...
# ADMIN_KEY=your-secret

uvicorn main:app --reload
# API runs at http://localhost:8000
```

> Without `DATABASE_URL`, `QDRANT_URL`, or `SUPABASE_URL` set, the backend falls back to SQLite, ChromaDB, and local file storage automatically.

### 2. Frontend

```bash
cd frontend
yarn
yarn dev
# UI runs at http://localhost:5173
# /api requests are proxied to the backend automatically
```

---

## Deploying (Free) — Render + Supabase + Qdrant

Storage is decoupled from the backend — no paid persistent disk needed.

| Service | What it hosts | Free tier |
|---|---|---|
| [Render](https://render.com) | FastAPI backend | Free web service (512 MB RAM) |
| [Vercel](https://vercel.com) | React frontend | Free static site |
| [Supabase](https://supabase.com) | PDF files + Postgres DB | 1 GB storage, 500 MB DB |
| [Qdrant Cloud](https://qdrant.tech/cloud/) | Vector embeddings (ChromaDB replacement) | 1 GB |

> **Local dev** still works with no changes — ChromaDB, SQLite, and local files are used automatically when the cloud env vars are absent.

### Step 1 — Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Storage** → **New bucket** → name it `pdf-documents`, set it to **private**.
3. Go to **Project Settings → Database** → copy the **Connection string (URI)** → this is your `DATABASE_URL`.
4. Go to **Project Settings → API** → copy the **Project URL** (`SUPABASE_URL`) and **service_role** key (`SUPABASE_SERVICE_KEY`).

### Step 2 — Qdrant Cloud

1. Create a free cluster at [cloud.qdrant.io](https://cloud.qdrant.io).
2. Copy the **Cluster URL** (`QDRANT_URL`) and create an **API Key** (`QDRANT_API_KEY`).

### Step 3 — Backend on Render

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New → Web Service** → connect your GitHub repo.
3. Configure the service:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}`
   - **Instance Type:** Free
4. Under **Environment Variables**, add:
   ```
   OPENAI_API_KEY        = sk-...
   ADMIN_KEY             = your-secret
   DATABASE_URL          = postgresql://... (from Supabase)
   QDRANT_URL            = https://xxxx.qdrant.io
   QDRANT_API_KEY        = ...
   SUPABASE_URL          = https://xxxx.supabase.co
   SUPABASE_SERVICE_KEY  = ...
   PYTHONUNBUFFERED      = 1
   ```
5. Click **Create Web Service**. Note the backend URL assigned by Render.

> The Render free tier spins down after 15 min of inactivity (~30 s cold start on next request).

### Step 4 — Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.
2. Set **Root Directory** to `frontend`.
3. Add environment variable — this tells the frontend where your Render backend is:
   ```
   VITE_BACKEND_URL = https://<your-render-backend-url>
   ```
4. Deploy.

---

## Adding a New Module

1. Open `https://your-app.onrender.com/admin`
2. Enter your admin key
3. Create a module with a name and description
4. Expand the module → upload PDFs (ingestion runs in the background, status shows in the UI)
5. Once status shows "ingested", go to the home page and chat with the module

---

## Project Structure

```
rag-application/
├── backend/
│   ├── main.py               # FastAPI app
│   ├── database.py           # SQLite (local) / Postgres (production) setup
│   ├── models.py             # Module + Document + Session + Message models
│   ├── auth.py               # Admin key dependency
│   ├── runtime.txt           # Python version pin for Render
│   ├── routers/
│   │   ├── modules.py        # Module CRUD
│   │   ├── documents.py      # Upload, delete, list documents
│   │   └── chat.py           # RAG streaming chat endpoint
│   ├── services/
│   │   ├── ingest.py         # PDF → chunks → vector store
│   │   ├── rag.py            # Retrieval + gpt-4o-mini streaming answer
│   │   ├── storage.py        # PDF storage (local filesystem or Supabase)
│   │   └── vectorstore.py    # Vector store (ChromaDB local or Qdrant Cloud)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx      # Module grid
│   │   │   ├── Chat.tsx      # Chat per module
│   │   │   └── Admin.tsx     # Admin panel
│   │   ├── components/       # ModuleCard, ChatWindow, UploadForm
│   │   └── lib/
│   │       ├── api.ts        # Typed API client (axios + streaming fetch)
│   │       └── utils.ts      # Shared utilities
│   └── vite.config.ts
├── data/                     # Created at runtime — local dev only (gitignored)
│   ├── modules/              # PDFs per module (replaced by Supabase in production)
│   └── chroma_db/            # Vector stores per module (replaced by Qdrant in production)
├── render.yaml               # Render Blueprint — deploys backend + frontend together
└── .env                      # Local env vars (gitignored)
```
