# Palette Optimization

A seed color should guide palette search. It does not guarantee that every runtime token must be derived by CSS from one variable.

## Principle

Prefer design-time optimization over one-size-fits-all formulas.

```txt
seed color + context + constraints → candidate colors → score → role palette
```

Final app CSS may use fixed custom properties exported from the preview:

```css
:root {
  --bg: #07110c;
  --surface: #0c1812;
  --text: #e8f3ec;
  --accent: #19aa59;
}
```

## Recommended algorithm

Use JavaScript in the contextual preview file. Keep production app CSS simple.

1. Convert seed and candidates into OKLab or Lab.
2. Define an allowed search region around the seed:
   - hue radius, usually 30–100 degrees depending on strategy
   - lightness range for role type
   - chroma cap to avoid neon UI
3. Generate candidate colors.
4. Optimize candidate positions with k-means style clustering as the default.
5. Use median cut as the simpler fallback or comparison strategy.
6. Score and role-map the resulting palette.
Score palettes by:
- perceptual distance between colors
- contrast for text roles
- surface depth order
- accent separation from surfaces
- closeness to seed or chosen companion hue

Then assign colors to roles, preview with project components, and export fixed CSS variables.

## Simple k-means sketch

```js
function kMeansPalette(candidates, centroids) {
  for (let i = 0; i < 24; i++) {
    const groups = groupByNearestCentroid(candidates, centroids);
    centroids = groups.map(meanLabColor).map(constrainToAllowedRegion);
  }
  return centroids;
}
```

## Median cut fallback

Use median cut when you need a simpler, deterministic fallback:

```js
function medianCut(colors, count) {
  let boxes = [makeColorBox(colors)];
  while (boxes.length < count) {
    const box = boxes.sort(byLargestLabRange).pop();
    boxes.push(...splitBoxAtMedian(box));
  }
  return boxes.map(averageBoxColor);
}
```

## Simple scoring sketch

```js
function scorePalette(palette) {
  return weightedSum({
    separation: minPairwiseDistance(palette.colors),
    textContrast: contrast(palette.text, palette.bg),
    mutedContrast: contrast(palette.text2, palette.surface),
    accentPop: distance(palette.accent, palette.surface),
    surfaceOrder: lightnessOrder(palette.bg, palette.surface, palette.surface2),
    seedAffinity: distancePenalty(palette.accent, palette.seed),
  });
}
```

## Strategy choices

Do not use one strategy for every seed.

- **Direct seed:** seed is usable as primary accent and nearby palette anchor.
- **Accent-only:** seed is too hot/light for surfaces; use only for small highlights.
- **Muted companion:** generate a calmer working hue from seed, use seed sparingly.
- **Deep companion:** for light seeds, find darker related companion for surfaces.
- **Split roles:** brand seed stays identity; UI roles come from adjacent stable hues.

## Output requirements

Export human-readable tokens, not raw generated arrays:

```css
:root {
  --bg: ...;
  --surface: ...;
  --surface2: ...;
  --border: ...;
  --text: ...;
  --text2: ...;
  --accent: ...;
  --accent2: ...;
}
```

Never hide generated values behind inscrutable math in production unless runtime theming is explicitly required.
