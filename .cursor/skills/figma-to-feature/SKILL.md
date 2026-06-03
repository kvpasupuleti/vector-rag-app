# Skill: Implement a Figma Design into this Project

Use this skill whenever a Figma URL is provided and the goal is to implement or update a UI feature in this codebase.

---

## Step 1 — Parse the Figma URL

From `https://figma.com/design/:fileKey/:name?node-id=1-2`:
- `fileKey` = segment after `/design/`
- `nodeId` = value of `node-id` param, with `-` converted to `:`

## Step 2 — Fetch design context

Call `get_design_context` with:
```
fileKey: <extracted>
nodeId: <extracted>
clientLanguages: "typescript"
clientFrameworks: "react"
```

If the response is truncated (too many nested layers), call `get_metadata` first to get the node tree, then fetch individual sections with separate `get_design_context` calls.

## Step 3 — Map Figma visuals to project tokens

**Never hardcode Figma hex values.** Map to the project's dark-theme tokens instead:

| Figma visual | Project Tailwind class |
|---|---|
| Dark/near-black background | `bg-[#09090b]` |
| Card / panel surface | `bg-white/[0.03]` or `bg-white/[0.04]` |
| Subtle borders | `border-white/[0.07]` or `border-white/[0.08]` |
| White / primary text | `text-white` |
| Grey secondary text | `text-zinc-300` — `text-zinc-400` |
| Muted / hint text | `text-zinc-500` — `text-zinc-600` |
| Orange primary CTA | `bg-gradient-to-r from-orange-500 to-amber-500` |
| Orange accent / icon tint | `text-orange-400`, `bg-orange-500/10` |
| Red / destructive | `border-red-500/20 bg-red-500/10 text-red-400` |
| Green / success | `text-emerald-400` |
| Input focus ring | `focus:border-orange-500/50` |

## Step 4 — Determine file placement

| What Figma shows | Where to place in the project |
|---|---|
| Full-page / route-level screen | `frontend/src/pages/MyPage.tsx` (default export, add `<Route>` in `App.tsx`) |
| Reusable UI block (card, form, widget) | `frontend/src/components/MyComponent.tsx` (named export) |
| API integration needed | Add interface + function to `frontend/src/lib/api.ts` |

## Step 5 — Apply project code conventions

- **Icons:** always `lucide-react`. If the Figma design uses icons, find the closest match in lucide-react. Do not install any icon package.
- **Class merging:** use `cn()` from `../lib/utils` — never template literal concatenation.
- **Rounding:** inputs/buttons → `rounded-xl`; cards/panels → `rounded-2xl`.
- **State:** local `useState` only — no new state library.
- **Data fetching:** `useEffect` + `useState` for loading/error/data — not TanStack Query unless already wired in that component.
- **New API endpoint needed:** follow `.cursor/skills/add-api-endpoint/SKILL.md` for the backend + `api.ts` wiring.

## Step 6 — Validate against the screenshot

`get_design_context` returns a screenshot. Before finishing:
- Verify spacing, alignment, and sizing match.
- Verify interactive states (hover, focus, disabled) are covered.
- Verify no hardcoded hex/rgb colours remain — all colours must use the token table above.

---

## What NOT to do
- Do not install new packages for icons, animations, or UI primitives.
- Do not create a global store or context for data that can live in local state.
- Do not use arbitrary Tailwind values (e.g. `bg-[#1a1a2e]`) — map to the project token table.
- Do not place business logic inside a component — if the Figma implies a new API call, add it to `api.ts`.
