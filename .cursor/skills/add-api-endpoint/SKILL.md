# Skill: Add a New API Endpoint (full-stack)

Use this skill when adding a new backend route and wiring it to the frontend.

---

## Step 1 — Model (if new table needed)
Add the SQLModel class to `backend/models.py`. See `.cursor/skills/add-sqlmodel/SKILL.md`.

## Step 2 — Service function (if business logic needed)
Add a function to the appropriate `backend/services/*.py` file (or create a new one).
- Pure function, no DB access, no classes.
- Follow the dual cloud/local pattern if touching storage or vectors.

## Step 3 — Pydantic response model
In the router file, define a `BaseModel` for the response shape. Example:
```python
class ThingRead(BaseModel):
    id: int
    name: str
    created_at: str

    class Config:
        from_attributes = True
```

## Step 4 — Router function
In `backend/routers/<feature>.py`:
```python
@router.get("/things/{thing_id}", response_model=ThingRead)
def get_thing(
    thing_id: int,
    db: Annotated[Session, Depends(get_session)],
    # Add this for admin-only routes:
    # _: Annotated[None, Depends(require_admin)],
):
    obj = db.get(Thing, thing_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Thing not found")
    return ThingRead(...)
```

If it's a new router file, register it in `backend/main.py`:
```python
from routers import things
app.include_router(things.router, prefix="/api")
```

## Step 5 — Frontend interface + API function
In `frontend/src/lib/api.ts`, add:
```typescript
export interface Thing {
  id: number
  name: string
  created_at: string
}

export const getThing = (id: number): Promise<Thing> =>
  api.get(`/things/${id}`).then((r) => r.data)
```
For admin endpoints:
```typescript
export const createThing = (data: { name: string }, adminKey: string): Promise<Thing> =>
  api.post('/things', data, { headers: { 'x-admin-key': adminKey } }).then((r) => r.data)
```

## Step 6 — Use in page/component
Call the API function in `useEffect` or an event handler. Set `useState` for loading/error/data.

---

## SSE Streaming endpoint (special case)
Backend — router returns `StreamingResponse`:
```python
@router.post("/things/{id}/stream")
async def thing_stream(id: int, body: StreamRequest):
    async def generate():
        with Session(engine) as db:
            async for event in some_async_generator(...):
                yield f"data: {json.dumps(event)}\n\n"
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```
Frontend — use `fetch` + `ReadableStream` (follow the `streamChat` pattern in `api.ts`), return `() => void` abort.
