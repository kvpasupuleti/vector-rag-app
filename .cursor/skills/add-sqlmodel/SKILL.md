# Skill: Add a New SQLModel Table

Use when adding a new database table to the project.

---

## Step 1 — Add class to `backend/models.py`

```python
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class Thing(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # Foreign key example:
    module_id: int = Field(foreign_key="module.id", index=True)
    name: str = Field(index=True)
    # Use str for enum-like fields with a comment showing allowed values:
    status: str = Field(default="pending")  # pending | done | error
    notes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

## Field type reference
| Data | SQLModel field |
|---|---|
| Primary key | `Optional[int] = Field(default=None, primary_key=True)` |
| Foreign key | `int = Field(foreign_key="table.id", index=True)` |
| Required string | `str` |
| Optional string | `Optional[str] = Field(default=None)` |
| String with default | `str = Field(default="value")` |
| Timestamp | `datetime = Field(default_factory=datetime.utcnow)` |
| Indexed field | `Field(..., index=True)` |
| Unique field | `Field(..., unique=True, index=True)` |
| JSON blob | `Optional[str] = Field(default=None)` — store as `json.dumps(...)`, parse with `json.loads(...)` |

## Step 2 — No migration needed
`create_db_and_tables()` runs on app startup via the lifespan function in `main.py` and calls `SQLModel.metadata.create_all(engine)`. New tables are created automatically on the next server start.

> **Caveat**: Adding a non-nullable column to an existing table with data requires a manual SQL migration (`ALTER TABLE ... ADD COLUMN ... DEFAULT ...`). Always add `default=` or `Optional` to new columns.

## Step 3 — Import in router
```python
from models import Thing  # add to existing import line
```

## Step 4 — Define Pydantic response model in the router file
Do **not** reuse the SQLModel class as a response model directly. Define a separate `BaseModel` in the router.
