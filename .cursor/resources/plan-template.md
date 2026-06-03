# Feature Plan Template

Copy this file to the project root as `PLAN.md` (or any name) and fill it out before running the `design-to-ship` pipeline.

---

```markdown
# Feature Plan: <Feature Name>

## Summary
<!-- One paragraph. What does this feature do and why. -->

## Figma
<!-- Paste the Figma node URL, or write "none" if purely backend. -->
Figma URL: https://figma.com/design/:fileKey/:name?node-id=1-2
Route in app: /modules/:id   <!-- The URL path where this feature appears -->

## Database Changes
<!-- List every model change. This drives the migration stage. -->

### New tables
- None  <!-- or: TableName — fields: name:str, module_id:int(FK→module.id), status:str(default=pending) -->

### New columns on existing tables
- None  <!-- or: Table.column_name — type, default, nullable (true/false) -->
<!-- IMPORTANT: any column added to an existing table needs a manual ALTER TABLE migration -->

### No changes
- [ ] Check here if no DB changes are needed

## Backend Changes
<!-- List new or modified endpoints. -->

### New endpoints
- None  <!-- or: PATCH /api/sessions/{id} — update session title — admin: false -->

### Modified endpoints
- None

### New service functions
- None  <!-- or: services/rag.py — summarise_session(session_id) → str -->

## Frontend Changes
<!-- Describe what changes in the UI. Reference Figma sections by name if applicable. -->
- None

## Test Scenarios
<!-- The browser-validate skill uses these to drive interactions. Be specific. -->
1. <!-- e.g. Navigate to /modules/1, click the rename icon, type "New Title", press Enter, verify title updates in sidebar and API returns 200 -->
2.
3.

## Acceptance Criteria
<!-- Checklist the AI verifies before committing. -->
- [ ] <criterion 1>
- [ ] <criterion 2>
- [ ] No console errors in browser
- [ ] All new API calls return 2xx
```
