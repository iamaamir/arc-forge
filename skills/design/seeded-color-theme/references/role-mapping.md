# Role Mapping

Palette generation is only useful after colors become UI roles. Map generated colors deliberately.

## Required roles

Minimum product UI roles:

```css
:root {
  --bg: ...;
  --surface: ...;
  --surface2: ...;
  --surface3: ...;
  --border: ...;
  --border-strong: ...;
  --text: ...;
  --text-muted: ...;
  --text-subtle: ...;
  --accent: ...;
  --accent-hover: ...;
  --on-accent: ...;
  --focus-ring: ...;
}
```

Optional semantic roles:

```css
:root {
  --success: ...;
  --warning: ...;
  --danger: ...;
  --info: ...;
}
```

For strict single-seed work, semantic colors can be shape/text based rather than red/yellow/green. If the product needs conventional error/success recognition, allow semantic exceptions.

## Mapping rules

- Background is not the darkest random color; it must support long reading.
- Surfaces need small but visible lightness steps.
- Borders should separate UI without glowing.
- Accent should be reserved for actions, focus, selection, and important state.
- Text colors must be chosen for reading, not palette symmetry.
- `--on-accent` must be tested on the accent background.
- Muted text should not look disabled unless it is disabled.

## Feedback translation

When user gives feedback, translate to role changes:

- “too bright” → accent role, surface lightness, or chroma cap
- “too green/blue/purple” → companion hue or search radius
- “flat” → surface spacing or accent separation
- “harsh” → border opacity, contrast distribution, or accent use
- “muddy” → increase lightness separation or reduce hue mixing
- “generic” → inspect project context again; palette may not match product mood

## Accessibility targets

- Normal text: aim for 4.5:1.
- Large text and UI boundaries: aim for 3:1.
- Do not maximize contrast everywhere.
- If a chosen aesthetic violates a target, call it out and ask whether to prioritize accessibility or style for that area.

## Dark and light modes

Generate role assignments for both modes by default. Do not assume dark tokens can be inverted into light tokens.

Recommended structure:

```css
:root {
  color-scheme: light dark;
  --bg: ...;
  --surface: ...;
  --text: ...;
  --accent: ...;
}

[data-theme="dark"] {
  --bg: ...;
  --surface: ...;
  --text: ...;
  --accent: ...;
}
```

If only one mode ships, still preview the other mode when practical to expose seed weaknesses.

## Production handoff

After preview approval:

1. Copy only role tokens and necessary component mappings.
2. Remove preview controls and generation scripts from production.
3. Keep comments explaining seed and strategy.
4. If runtime theming is needed later, rebuild around stored seed + generated tokens.
