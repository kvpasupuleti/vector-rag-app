# Dev Commands

## Backend
```bash

# Checkout to backend folder
cd backend

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run dev server (from repo root)
uvicorn main:app --reload --port 8000
```

## Frontend
```bash
# Checkout to Frontend folder
cd frontend

# Install dependencies
yarn install

# Run dev server
yarn dev
```

## Full stack (two terminals)
Terminal 1: `cd backend && uvicorn main:app --reload --port 8000`
Terminal 2: `cd frontend && yarn dev`

## Environment
Copy required env vars to `backend/.env` (see `.cursor/resources/env-vars.md`).
