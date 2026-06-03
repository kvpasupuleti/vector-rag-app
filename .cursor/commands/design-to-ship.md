# Command: Design → Build → Validate → Commit (Full Pipeline)

## Purpose
A single-prompt, fully chained pipeline covering the entire feature development lifecycle:

```
Plan → Backend Models → DB Migration → Backend Logic → Frontend (Figma) → Lint → Browser Validate → Git Commit
```

---

## How to prompt

```
Design to ship: <figma-url or "none">
Plan: <path to PLAN.md, e.g. PLAN.md>
```

Example — design-driven feature:
```
Design to ship: https://figma.com/design/abc123/KnowledgeBase?node-id=42-15
Plan: PLAN.md
```

Example — backend-only feature (no Figma):
```
Design to ship: none
Plan: PLAN.md
```

Create `PLAN.md` using the template at `.cursor/resources/plan-template.md` before running this command.

---

## Pipeline the AI follows

### Stage 0 — Read the plan
1. Read the plan file specified in the prompt.
2. Extract and hold in context:
   - Feature name and summary
   - DB changes (new tables, new columns on existing tables)
   - New endpoints and service functions
   - Frontend route and UI changes
   - Test scenarios and acceptance criteria
3. If the plan is missing required sections, stop and ask the user to fill them in.

---

### Stage 1 — Backend: Models (skill: `add-sqlmodel`)
*Skip if plan says no DB changes.*

4. Read `.cursor/skills/add-sqlmodel/SKILL.md`
5. Add new `SQLModel` classes to `backend/models.py` as described in the plan.
6. For each new column on an **existing** table: flag it — a migration is required in Stage 2.
7. For new tables only: no migration needed — `create_all` handles them on restart.

---

### Stage 2 — Backend: Database Migration (skill: `db-migration`)
*Skip if no columns are being added to existing tables.*

8. Read `.cursor/skills/db-migration/SKILL.md`
9. Detect active DB: run `python3 -c "import os; print('postgres' if os.getenv('DATABASE_URL') else 'sqlite')"` from `backend/`.
10. Run the appropriate `ALTER TABLE` command for each new column (SQLite or PostgreSQL path).
11. Verify the column appears in `PRAGMA table_info` (SQLite) or `information_schema.columns` (Postgres).

---

### Stage 3 — Backend: Services and Routers (skill: `add-api-endpoint`)
*Skip if plan says no new endpoints.*

12. Read `.cursor/skills/add-api-endpoint/SKILL.md`
13. Add service functions to `backend/services/*.py` as described in the plan.
14. Add Pydantic request/response models and router functions in `backend/routers/*.py`.
15. Register any new router file in `backend/main.py`.
16. Verify the backend server is still running (uvicorn `--reload` picks up changes automatically).
17. Hit the new endpoint once with a quick sanity check: `curl -s http://localhost:8000/api/health` — confirm 200.

---

### Stage 4 — Frontend: Implement (skill: `figma-to-feature`)
*Skip this stage and go to Stage 5 if `Design to ship: none`.*

18. Read `.cursor/skills/figma-to-feature/SKILL.md`
19. Parse Figma URL → call `get_design_context(fileKey, nodeId, clientLanguages="typescript", clientFrameworks="react")`
20. Map Figma visuals to the project's dark-theme token table (never hardcode hex values).
21. Place files per plan: new page → `pages/`, reusable block → `components/`, API calls → `api.ts`.
22. For purely plan-driven frontend (no Figma): implement following the plan's description and all conventions in `.cursor/rules/frontend-code.mdc`.

---

### Stage 5 — Lint and Type Check
23. Run frontend lint: `cd frontend && yarn lint`
    - Fix any ESLint errors before continuing. Warnings are acceptable.
24. Run TypeScript check: `cd frontend && tsc --noEmit`
    - Fix any type errors before continuing.
25. Run backend syntax check on all modified files:
    ```bash
    python3 -m py_compile backend/models.py backend/routers/*.py backend/services/*.py
    ```
    - Fix any syntax errors before continuing.

---

### Stage 6 — Browser Validation (skill: `browser-validate`)
26. Read `.cursor/skills/browser-validate/SKILL.md`
27. Confirm both dev servers are reachable: `http://localhost:8000/api/health` and `http://localhost:5173`
28. For **each test scenario** listed in the plan's "Test Scenarios" section, run the full validate sequence:
    - Navigate → lock → snapshot → screenshot → interact → wait → snapshot → check console → check network
29. Verify every **acceptance criterion** from the plan is met.
30. Unlock the browser.
31. If any check fails:
    - Fix the code (max 2 attempts per failure)
    - Re-run from Step 28 for the failing scenario only
    - If still failing after 2 attempts: stop and report the specific failure to the user

---

### Stage 7 — Git Commit
*Only reached when all validation checks pass and all acceptance criteria are met.*

32. Stage all modified and new files:
    ```bash
    git add -A
    ```
33. Review the diff to confirm only feature-related files are staged. Unstage anything unrelated.
34. Commit with a message derived from the plan's feature name and summary:
    ```bash
    git commit -m "$(cat <<'EOF'
    <verb> <feature name from plan>

    <1-2 sentence summary from plan. What it does and why.>
    EOF
    )"
    ```
    Verb guide: `add` for new feature, `update` for enhancement, `fix` for bug fix.
35. Run `git status` to confirm the working tree is clean.

---

## Stopping conditions
- **Pass:** all acceptance criteria met, all validation checks green, commit created → pipeline complete. Report the files changed and commit hash.
- **Blocked:** plan is incomplete → stop at Stage 0 and ask user to fill in the missing section.
- **Migration failure:** ALTER TABLE fails → stop at Stage 2, show the exact error, ask user to resolve DB state manually.
- **Lint/type errors persist:** stop at Stage 5 after 2 fix attempts, show remaining errors.
- **Validation failure persists:** stop at Stage 6 after 2 fix attempts per scenario, report exactly what failed and what was tried.

---

## Notes
- Both dev servers (`uvicorn --reload` + `yarn dev`) should be running before the prompt is sent.
- The plan file is the single source of truth — if the Figma design and the plan conflict, follow the plan and note the discrepancy.
- Never commit if any lint error, type error, or browser validation failure is unresolved.
