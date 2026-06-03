# Skill: Validate a Feature Using the Browser

Use this skill after implementing a feature to verify it works correctly in the running app.
Uses the `cursor-ide-browser` MCP (Playwright-backed).

---

## Prerequisites

Both dev servers must be running before validation starts:
- **Frontend:** `http://localhost:5173` (Vite)
- **Backend:** `http://localhost:8000` (uvicorn)

If either is not running, use the dev.md command to start the local servers, or instruct the user to start them before continuing.

---

## Step 1 — Navigate to the feature

```
browser_navigate(url: "http://localhost:5173")
```

Then navigate to the specific route that contains the feature being validated.
- Module list → `/`
- Chat page → `/modules/:id`
- Admin panel → `/admin`

---

## Step 2 — Lock the browser

```
browser_lock()
```

Prevents accidental user interaction during automated validation.

---

## Step 3 — Snapshot the page structure

```
browser_snapshot()
```

Use the accessibility tree to confirm:
- Expected elements are present (buttons, inputs, headings, lists)
- No "undefined", "null", or "[object Object]" text is visible
- Loading states have resolved (no spinner is still visible after a reasonable wait)

If an element is still loading, use `browser_wait_for(text: "...", timeout: 5000)` before snapshotting again.

---

## Step 4 — Take a visual screenshot

```
browser_take_screenshot(fullPage: false)
```

Compare against the Figma screenshot (if this was a Figma-driven feature) or the prior state. Check:
- Layout and spacing look correct
- Dark-theme tokens are applied (no white/light backgrounds leaking through)
- Orange accent colours appear where expected

---

## Step 5 — Interact with the feature

Drive the feature's primary user flow using the browser tools. Sequence depends on what was built, but the general pattern is:

1. **Find the element:** use `browser_snapshot()` to get element refs
2. **Interact:** `browser_click(ref)`, `browser_fill(ref, value)`, `browser_type(ref, text)`, `browser_select_option`
3. **Wait for async result:** `browser_wait_for(text: "expected text", timeout: 5000)`
4. **Snapshot again:** confirm the UI updated correctly

### Common feature scenarios

| Feature type | Interaction sequence |
|---|---|
| Inline edit (e.g. rename session) | Click pencil icon → snapshot input appears → fill new title → press Enter → wait for title update → snapshot |
| Form submission | Fill fields → click submit → wait for success state → snapshot |
| Delete action | Click delete → handle confirm dialog if any → wait for item disappear → snapshot |
| Chat / streaming | Fill question → click send → wait for "done" token → snapshot response bubble |
| Upload | Navigate to admin → expand module → upload file → wait for "ingested" status → snapshot |

---

## Step 6 — Check for console errors

```
browser_console_messages()
```

Flag any `error` or `unhandled` entries. Warnings are acceptable; errors are not.

---

## Step 7 — Check network requests

```
browser_network_requests()
```

Verify:
- The expected API endpoint was called (e.g. `PATCH /api/sessions/:id`)
- Response status is `2xx`
- No `401` (admin key missing) or `404` (wrong route) errors on the new endpoint

---

## Step 8 — Unlock the browser

```
browser_unlock()
```

Always unlock after validation, even if a step fails.

---

## Validation Report

After completing the steps, produce a short report in this format:

```
## Validation Result

**Feature:** <feature name>
**Route tested:** <URL>

### Checks
- [ ] Page structure — expected elements present
- [ ] Visual screenshot — matches design intent
- [ ] Interaction flow — primary action completes correctly
- [ ] UI update — DOM reflects the new state after action
- [ ] Console — no JS errors
- [ ] Network — correct endpoint called, 2xx response

### Issues found
<list any failures, or "None">
```

If any check fails, do not mark the feature as done — describe the failure and fix the code before re-running from Step 3.
