# Accessibility Guide for Interactive Lessons

Every lesson MUST satisfy these requirements. Check before calling a lesson complete.

---

## Structural

- [ ] Exactly one `<h1>` per page
- [ ] Headings descend sequentially (no jumping from `h1` to `h3`)
- [ ] Landmarks: `<main>` for primary content, `<nav>` for navigation, `<section aria-labelledby="...">` for sections
- [ ] All interactive elements are keyboard-reachable (native `<button>`, `<a>`, `<input>` — not `div` with click handler)

## Visual

- [ ] Text contrast ≥ 4.5:1 (normal) / 3:1 (large text) — check against both light and dark themes
- [ ] Color is never the sole differentiator (pair with text label, icon, or pattern)
- [ ] Focus indicators visible on all interactive elements (`outline` or `box-shadow`, not just `opacity` change)

## Images & Graphics

- [ ] `<img>` elements have `alt` text
- [ ] `<svg>` has `role="img"` + `aria-label` on the `<svg>` or `aria-hidden="true"` + visible text nearby
- [ ] `<canvas>` has `aria-label` describing the visualization
- [ ] Every diagram has a text alternative (table, event log, or paragraph description)

## Forms & Controls

- [ ] All `<input>`, `<select>`, `<textarea>` have associated `<label>` elements
- [ ] `<fieldset>` + `<legend>` for groups of radio buttons / checkboxes
- [ ] Error messages are connected via `aria-describedby`

## Dynamic Content

- [ ] Content that updates asynchronously uses `aria-live="polite"` region
- [ ] Status changes (e.g., "Correct!", "Simulation complete") announced without focus change

## Animation

- [ ] All animations, transitions, and scroll behaviors respect `prefers-reduced-motion`

Use this rule as a reset:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Testing

- [ ] Tab through every interactive element — can you reach and activate everything?
- [ ] Does the page make sense with images/CSS disabled?
- [ ] Test with a screen reader (VoiceOver on macOS: `Cmd+F5`, then `Ctrl+Option+Arrow` to navigate)
