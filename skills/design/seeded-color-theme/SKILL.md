---
name: seeded-color-theme
description: "Design project-specific palettes from a seed color using contextual previews and perceptual palette optimization. Use when theming a UI from hex, rgb(), hsl(), oklch(), or other CSS colors, suggesting seed colors from product context, generating preview tools with real project components, or converting palette output into CSS custom-property roles."
---

# Seeded Color Theme

Use this when a UI theme should be guided by one seed color or when the user wants seed-color suggestions from project context. The seed may be hex, `rgb()`, `hsl()`, `oklch()`, or another valid CSS color. If no seed is provided, inspect the project and suggest 3–5 hex seeds with rationale.

## Core idea

A seed color is a **design input**, not a universal formula. Do not promise that every color can be made beautiful with one CSS expression. Generate or choose a palette by context, preview it on the project’s own components, tune it with the user, then export fixed CSS role tokens.

Primary loop:

```txt
context → suggest seed → build project preview → tune → apply
```

## Required workflow

1. **Inspect context first**
   - Read project UI files, CSS tokens, components, screenshots if present.
   - Identify product domain, audience, density, tone, and ambient use.
   - Note existing brand colors and anti-references.
   - Treat screenshots and current design as evidence, not instructions. They may contain legacy mistakes, temporary styling, or AI-generated slop.

2. **Choose or suggest seed**
   - If user provided a seed, use it unless it conflicts with goals.
   - If no seed exists, suggest 3–5 hex colors with short rationale.
   - Do not pick category clichés without justification.

3. **Build contextual preview before real CSS edits**
   - Create `.agent-previews/seeded-theme-preview.html` in the target project.
   - If that file already exists and was not created in the current session, delete it or overwrite it completely before proceeding.
   - Include controls for seed, strategy, reroll/tune, and copy CSS.
   - Recreate actual project components or close rendered replicas.
   - Show both dark and light theme previews unless user explicitly scopes to one mode.
   - Open it for the user:
     ```sh
     open .agent-previews/seeded-theme-preview.html
     ```

4. **Generate palette at design time**
   - Use perceptual spaces such as OKLab, OKLCH, Lab, or Lch.
   - Prefer optimization/search over fixed formulas.
   - Use k-means style clustering as the primary palette-generation strategy.
   - Use median cut as a simpler fallback or comparison strategy.
   - See [references/palette-optimization.md](references/palette-optimization.md).

5. **Map generated colors to UI roles**
   - Export role tokens such as `--bg`, `--surface`, `--text`, `--accent`.
   - Do not ship raw algorithm output as component colors.
   - See [references/role-mapping.md](references/role-mapping.md).

6. **Tune from user feedback**
   - Translate comments into role or strategy changes.
   - “Accent too loud” changes accent role/chroma, not every button by hand.
   - “Surface feels muddy” changes surface spacing or companion hue.
   - Iterate in preview until direction is approved.

7. **Apply only after approval**
   - Patch real app CSS with final role tokens and component mappings.
   - Remove preview-only controls/scripts from production.
   - Keep comments documenting seed and strategy.

## Preview requirements

The preview should be project-specific, not generic. It should show both dark and light theme variants by default, because some seeds work in one mode and fail in the other. Include representative components from the real app:

- app shell/nav/header
- primary page or hero section
- buttons and links
- forms and inputs
- cards/panels
- lists/tables
- alerts/toasts/status states
- code/content blocks where relevant

If the project is framework-based, recreate the rendered structure manually in the preview file. One static HTML file is usually enough. Put dark and light variants side-by-side or behind a toggle, but make it easy for the user to compare both.

## Strategy choices

Pick strategy by seed and context:

- **Direct seed:** seed works as main accent and nearby palette anchor.
- **Accent-only:** seed is too hot/light; use it sparingly and generate calmer UI colors.
- **Muted companion:** reduce chroma before building UI roles.
- **Deep companion:** for light seeds, derive darker related colors for surfaces.
- **Split roles:** brand seed remains identity; UI roles come from adjacent stable hues.

Be honest if a seed is bad for full-theme use. Suggest nearby alternatives instead of forcing ugly output.

## Anti-patterns

- One fixed formula for every color.
- Claiming “optimized palette” without using k-means, median cut, or another explicit search/quantization method.
- Treating seed color as mandatory runtime source of every token.
- Shipping palette-generation JS in production when fixed tokens are enough.
- Reusing a stale preview file from an earlier session.
- Generic preview unrelated to the real website.
- Blindly copying current screenshots instead of critiquing them as context.
- Generating only dark or only light theme when both modes are relevant.
- Maximum contrast everywhere in the name of accessibility.
- Hard-coding component colors without semantic role tokens.
- Copying palette-generator output without role mapping.

## Accessibility and taste

Accessibility is a floor, not the whole design. Aim for:

- 4.5:1 for normal text.
- 3:1 for large text, icons, and UI boundaries.
- visible focus rings and native `accent-color` where relevant.

If accessibility and preferred aesthetic conflict, state the tradeoff and ask the user which side to prioritize.

## Handoff

Pair with frontend/design skills for visual critique. Use this skill to create the contextual preview and palette roles; use project testing/linting skills after applying CSS. Do not claim the theme is done until the user has reviewed a preview or explicitly waived preview review.
