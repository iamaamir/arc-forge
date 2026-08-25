# Visualizing the Dependency Graph

A guide for the host agent/harness to render a dependency graph from imports analyzed during the forge-rules session. **The choice of rendering mechanism belongs entirely to the host environment** — this guide prescribes data formats and conventions only. No rendering code ships with this skill.

## Source data

Edges come from the analysis stage: static `import` / `require` / `export ... from` specifiers resolved to repo-relative paths (the same extraction the deps gate performs). If `forge-gate check --deps` has run, its violation output supplies the violation edges.

## Formats

Render the graph in one of:

- **Mermaid**: a `graph` declaration, one node per collapsed unit, one edge per import.
- **DOT**: a digraph with the same node/edge mapping.

Both are plain text and can be emitted inline in a message or written to a file for the host to render.

## Node conventions

- **Collapse directories to single nodes when they exceed N files**, where N is chosen by the host for legibility of the particular graph (a graph with 200 file nodes is unreadable; collapse those directories). Small directories may stay at file granularity.
- Label directory nodes by their repo-relative path; label file nodes by path relative to the nearest collapsed ancestor.
- Entry points (no incoming imports) may be visually marked, since they anchor the graph's top.

## Edge conventions

- One edge per resolved import, direction = importer → imported.
- **Violation edges are styled distinctly** from compliant edges: if the deps gate has reported violations in this session, give those edges a different style/weight/color than passing edges (e.g., dashed or bolded in Mermaid, `style=dashed` plus a distinct color in DOT), so accepted debt is visible in the picture, not just in notes.
- Deduplicate parallel edges between the same pair of nodes; note the multiplicity in the edge label if it matters.
- External packages (node_modules) are out of scope unless `allowNodeModules` is configured as an array — then show governed externals as boundary nodes.

## Host responsibilities

The host picks: renderer (terminal, HTML preview, image), layout engine, collapse threshold N, and whether the graph appears inline or as an artifact. This guide deliberately does not choose for you.
