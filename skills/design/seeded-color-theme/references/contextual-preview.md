# Contextual Theme Preview

Use this when applying a seeded theme inside a real project. Project fit comes from previewing the project’s own components, not from a generic palette demo.

## Workflow

1. Inspect project context
   - Read visible UI files: HTML, CSS, component files, route/page files.
   - Identify product purpose, audience, density, tone, and ambient use.
   - Note existing brand colors, logos, screenshots, and anti-references.
   - Treat screenshots/current UI as context to critique, not as truth. Preserve what works; reject legacy clutter or generic AI styling.

2. Suggest seed colors when none is provided
   - Offer 3–5 hex seeds with one-line rationale each.
   - Seeds should match context, not category cliché.
   - If user already provided a seed, skip suggestions unless it clearly conflicts with stated goals.

3. Select representative components
   Choose 5–8 components that expose palette weaknesses:
   - app shell/nav/header
   - hero or primary page section
   - buttons and links
   - forms and inputs
   - cards/panels
   - list/table rows
   - alert/toast/status
   - code/content block

4. Build temporary project preview
   - Create a local preview file, usually `.agent-previews/seeded-theme-preview.html`.
   - If the preview file already exists and was not created in this session, delete it or overwrite it completely. Stale previews confuse both agents and users.
   - Include palette generation, strategy selection, tuning controls, and copy CSS.
   - Recreate project components from the existing DOM/CSS/component files.
   - Show both dark and light variants unless the user scoped the work to one mode.
   - Keep it disposable and do not wire it into production.

5. Open preview for user
   ```sh
   open .agent-previews/seeded-theme-preview.html
   ```

6. Tune from feedback
   Translate comments into roles first:
   - surface too green → surface role or surface depth
   - accent too loud → accent chroma/lightness or action mapping
   - borders too visible → border mix or component usage
   - text too cold/warm → text role mix
   - palette too flat → clustering constraints or role mapping
   - dark mode works but light mode fails → generate separate role assignments per mode

7. Apply only after approval
   - Patch real CSS after user likes the preview direction.
   - Keep `--brand` as the seed source.
   - Do not copy every preview style blindly; transfer token engine and role mappings.

## Preview file principles

- One file is preferred for fast review.
- Never append to an old preview from a previous session.
- No build step unless project requires it.
- Use inline CSS for preview-only controls.
- Use real project class names or close replicas when possible.
- If components are framework-only, recreate their rendered structure manually.
- Include a “copy CSS tokens” button.
- Include tuning knobs for seed, strategy, clustering constraints, and role mapping.
- Include side-by-side or toggleable dark/light previews.

## Seed suggestions

Good seed suggestions mention context:

```txt
#19aa59 — focused coding green, energetic but not neon.
#2f6f8f — technical teal, calmer for dense dashboards.
#7a5cff — confident product violet, sharper and less coding-specific.
```

Bad suggestions are category clichés:

```txt
Finance → navy.
Healthcare → teal.
AI app → purple gradient.
```

## Handoff checklist

Before editing real app CSS:
- Preview was created fresh in the current session or explicitly overwritten.
- User saw project-specific preview.
- User saw dark and light variants, or explicitly waived one mode.
- Seed color is chosen.
- Token roles are approved.
- Known weak spots are noted.
- Accessibility concerns are accepted or assigned follow-up.
