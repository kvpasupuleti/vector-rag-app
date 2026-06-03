# Skill: Database Migrations (SQLModel)

This project uses SQLModel with `create_all()` on startup — there is no Alembic. Understand what requires a manual migration vs what is automatic.

---

## When is a migration needed?

| Change | Action required |
|---|---|
| **New table** (new `SQLModel` class) | None — `create_all` creates it on next server restart |
| **New nullable column** on existing table | **Manual ALTER TABLE** — `create_all` never modifies existing tables |
| **New column with default** on existing table | **Manual ALTER TABLE** |
| **Delete or rename a column** | **Manual SQL** — SQLModel has no support for DROP/RENAME COLUMN |
| **Add an index** | **Manual SQL** — `CREATE INDEX IF NOT EXISTS ...` |

---

## Step 1 — Make the model change first

Edit `backend/models.py` before running any migration. The model and the DB must always stay in sync.

For a new column, always use `Optional` or a `default=` so existing rows remain valid:
```python
# safe — existing rows get NULL
new_field: Optional[str] = Field(default=None)

# safe — existing rows get the default
status: str = Field(default="pending")

# NEVER add a non-nullable column without a default to a table that has rows
```

---

## Step 2 — Detect the active database

Check whether `DATABASE_URL` is set:
```bash
# from backend/ directory
python3 -c "import os; print('postgres' if os.getenv('DATABASE_URL') else 'sqlite')"
```

---

## Step 3 — Run the migration

### SQLite (local dev — DATABASE_URL not set)

```bash
cd backend
python3 -c "
import os, sqlite3
from pathlib import Path
data_dir = Path(os.getenv('DATA_DIR', './data'))
db_path = data_dir / 'kt_knowledge_base.db'
conn = sqlite3.connect(db_path)
conn.execute('ALTER TABLE <table_name> ADD COLUMN <col_name> <TYPE> DEFAULT <value>')
conn.commit()
conn.close()
print('Migration applied.')
"
```

SQL type reference for SQLite:
| Python type | SQLite type |
|---|---|
| `str` | `TEXT` |
| `int` | `INTEGER` |
| `float` | `REAL` |
| `bool` | `INTEGER` (0/1) |
| `datetime` | `TEXT` |
| Nullable | append `DEFAULT NULL` |

### PostgreSQL (production — DATABASE_URL is set)

```bash
cd backend
python3 -c "
import os
import psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute('ALTER TABLE <table_name> ADD COLUMN IF NOT EXISTS <col_name> <TYPE> DEFAULT <value>')
conn.commit()
conn.close()
print('Migration applied.')
"
```

Use `ADD COLUMN IF NOT EXISTS` on PostgreSQL to make the migration re-runnable.

---

## Step 4 — Verify

Restart the backend dev server (or let uvicorn `--reload` pick up the model change), then query the table:

```bash
cd backend
python3 -c "
import os, sqlite3
from pathlib import Path
conn = sqlite3.connect(Path(os.getenv('DATA_DIR','./data'))/'kt_knowledge_base.db')
cols = [r[1] for r in conn.execute('PRAGMA table_info(<table_name>)')]
print(cols)
conn.close()
"
```

Confirm the new column name appears in the output.

---

## Deleting / renaming a column

SQLite does not support `DROP COLUMN` before version 3.35 and does not support `RENAME COLUMN` before 3.25. The safe approach for any destructive change is:

1. Rename the old table: `ALTER TABLE t RENAME TO t_old`
2. Create the new table with the correct schema (SQLModel `create_all` will do this after the rename)
3. Copy data: `INSERT INTO t SELECT col1, col2 FROM t_old`
4. Drop the old table: `DROP TABLE t_old`

Only do this on **local dev data** — never run destructive migrations against production without a backup.
