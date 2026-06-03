# Command: Implement a Figma Design Feature

## When to use
Invoke this command when you have a Figma URL for a new UI feature or a design update to an existing one.

## How to prompt in the chat window

```
Implement this Figma design: <figma-url>
```

Or for an update:
```
Update [component/page name] to match this Figma design: <figma-url>
```

That's all you need to provide. The AI will:
1. Read `.cursor/skills/figma-to-feature/SKILL.md`
2. Call `get_design_context` on the Figma node
3. Map Figma visuals to the project's dark-theme tokens
4. Place files in the correct layer (`pages/`, `components/`, or `api.ts`)
5. Follow all project conventions (lucide-react icons, `cn()`, rounded tokens, no new packages)
6. Validate the output against the Figma screenshot

## Tips
- Provide the deepest node URL you want implemented (a specific component, not the whole file) for best results.
- If the design requires a new backend endpoint, mention it: `"This will need a new API endpoint for X"` — the AI will follow the `add-api-endpoint` skill automatically.
- If the response is cut off mid-design (large/complex screen), ask: `"Continue with the next section"` and the AI will fetch child nodes individually.
