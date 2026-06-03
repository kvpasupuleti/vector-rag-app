# Command: Validate a Feature in the Browser

## When to use
After implementing any frontend feature — run this to verify the feature works correctly in the live app before marking it done.

## How to prompt

```
Validate the [feature name] feature on [route or page]
```

Examples:
```
Validate the rename session feature on the Chat page
Validate the document upload flow on the Admin page
Validate the new module card design on the Home page
```

The AI will:
1. Read `.cursor/skills/browser-validate/SKILL.md`
2. Navigate to the relevant route at `http://localhost:5173`
3. Snapshot the page structure
4. Take a visual screenshot
5. Drive the feature's primary user interaction
6. Check console for JS errors
7. Check network requests for the correct API call and 2xx status
8. Unlock the browser and produce a validation report

## Prerequisite
Both dev servers must be running:
```
Terminal 1: cd backend && uvicorn main:app --reload --port 8000
Terminal 2: cd frontend && yarn dev
```
