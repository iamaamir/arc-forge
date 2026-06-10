---
name: lesson-craft
description: "Build interactive, hands-on courses with sequenced lessons, rich visual demos (SVG/Canvas/WebGL), Web Components, and adaptive learning loops. For any topic, on any browser, with zero infrastructure."
argument-hint: topic to teach
---

# Lesson Craft

An interactive course-building skill. It uses mission-driven learning, zone of proximal development, and a knowledge/skills/wisdom triad — with a prescribed tech stack, reusable demo patterns, and an adaptive generation workflow.

## What's in this skill

| File | Purpose |
|---|---|
| `SKILL.md` | This file — philosophy, tech stack, demo patterns, workflow |
| `MISSION-FORMAT.md` | Template for the learner's mission document |
| `RESOURCES-FORMAT.md` | Template for curating external sources |
| `LEARNING-RECORD-FORMAT.md` | Template for adaptation-signal learning records |
| `GLOSSARY-FORMAT.md` | Template for canonical terminology |
| `references/demo-patterns.md` | Code patterns for SVG, Canvas, WebGL, sandbox, multi-modal demos |
| `references/lesson-components.js` | Web Component definitions: header, nav, knowledge-check, source-code |
| `references/lesson.css` | Starting point stylesheet (agent customizes theme) |
| `references/accessibility-guide.md` | WCAG checklist for lesson self-review |
| `references/_example-lesson.html` | Complete working lesson showing SVG + Canvas demo patterns |
| `references/build-static.mjs` | Optional script for GitHub Pages deployment |

## Core Principles

- **Learn by doing.** Every concept gets a runnable exercise, an interactive demo, or both. Passive reading is not a lesson.
- **Multiple representations.** Every mechanism is shown as visual (SVG/Canvas) AND textual (logs/tables) AND runnable (tests/exercises).
- **Incremental, adaptive generation.** Lessons are generated ONE AT A TIME. Default: incremental. Only batch when explicitly asked.
- **Zero infrastructure, maximum portability.** Lessons open directly from the filesystem (`file://`). No server, no build step, no npm install.
- **Progressive disclosure.** Surface complexity layer by layer. Each lesson assumes only what came before it.

## Quick Start

1. Interview the learner, write `MISSION.md`
2. Build ONE lesson — teach one concept, one at a time
3. Every lesson needs: (a) a memorable framing device, (b) a visual or code demo, (c) an interview-angle payoff, (d) a pro tip from real-world experience
4. Connect each lesson to the next: end with a challenge question that sets up the next problem
5. After the learner engages, write a learning record, then adapt the next lesson

The rest of this skill explains each of these in detail. Read the references/ for demo code patterns, component APIs, and the a11y checklist.

## Teaching Craft

A technically accurate lesson is not the same as a good lesson. Good lessons teach — they change how the learner thinks. These patterns produce good lessons.

### Framing Device

Open every lesson with a metaphor, analogy, or memorable image that makes the concept intuitive. The learner should feel "oh, it's like X" within the first paragraph.

*Example: "RabbitMQ is not just a queue. It is a post office with sorting machines."*
*Example: "Consensus is not about voting. It is about agreeing on a single log even when nodes crash."*

### Tangible Payoff

End every lesson by proving the concept matters. What form that takes depends on the mission:

- **Career-prep mission** → an interview question with a model answer
- **Build-something mission** → "With this concept, you can now build X" + a mini-challenge
- **Conceptual mission** → a counterintuitive demo or thought experiment that only makes sense with this lesson's knowledge

The key: the learner should close the page feeling *smarter than when they opened it*. A concrete, mission-aligned payoff does this. A generic summary ("in this lesson we learned...") does not.

### Narrative Continuity

End each lesson with a challenge question or scenario that the current tools cannot solve. The next lesson begins by showing how its new concept solves that exact problem.

*Example: Lesson 3 teaches basic message delivery. The challenge: "What happens when a consumer crashes mid-processing? The message is gone forever." Lesson 4 opens: "Last time we saw the 'gone forever' problem. Here's how ACKs fix it."*

### Memorable Frameworks

Distill each lesson's core insight into a 2-3 word memorable label. "Three-legged stool" (reliability needs ACKs + persistence + confirms). "Smart Broker vs Dumb Broker" (RabbitMQ vs Kafka philosophy). "Death Loop" (poison pill problem). These give the learner hooks to hang knowledge on.

### Real-World Wisdom (Pro Tips)

Sprinkle operational experience throughout: "In production, always set `prefetch_count` to avoid memory bloat." "DLQ monitoring is not optional — every production system needs alerts for dead-lettered messages." These make the lesson feel experienced, not academic.

### Practical Exercises

At least one exercise per lesson must involve running real software (Docker, CLI, actual code) — not just clicking in a sandbox demo. Visual demos show; exercises teach. A lesson with only visual demos is a slideshow, not a lesson.

### Citations

Every claim needs a link to the source (official docs, academic paper, trusted article). A lesson with zero citations cannot be verified by the learner. If you don't know a source, mark it with a note: "This is my understanding — verify against the official documentation at {URL}."

### Style Consistency

After generating a lesson that is NOT the first one, read the previous lesson and compare:

| Dimension | Check |
|---|---|
| **Tone** | Formal or conversational? Direct or exploratory? Does the new lesson sound like the same teacher? |
| **Depth** | Similar paragraph length per concept? Similar code-to-prose ratio? Assumes the same prior knowledge? |
| **Demo style** | SVG-only or full Canvas? Simple button or multi-scenario sandbox with presets? |
| **Knowledge checks** | Scenario-based or recall? How many options? Same level of difficulty? |
| **Vocabulary** | Uses glossary terms consistently? Same technical level? |
| **Citations** | Both have external references? Similar density? |

If a learner would notice a different teacher wrote this, revise until the match is close. The first lesson sets the baseline; every subsequent lesson self-corrects toward it.

## Workspace Structure

```
topic-course/
├── MISSION.md               # Why the learner is here (from teach)
├── RESOURCES.md             # Curated sources + communities (from teach)
├── NOTES.md                 # Agent scratchpad (from teach)
│
├── lessons/
│   ├── 0001-short-description.html
│   ├── 0002-short-description.html
│   └── ...
│
├── learning-records/
│   ├── 0001-key-insight.md
│   ├── 0002-key-insight.md
│   └── ...
│
├── reference/
│   └── glossary.html         # Canonical terminology (from teach)
│
├── src/                      # Source modules — ESM (.mjs)
├── tests/                    # Module tests — node:test
├── assets/
│   ├── lesson.css            # Shared lesson styles (agent authors)
│   └── lesson-components.js  # Web Component definitions
│
├── index.html                # Course front door / roadmap
└── scripts/
    └── build-static.mjs      # Optional: bundle for deployment
```

Create directories lazily — only when first used.

## Tech Stack (Prescribed)

| Layer | Technology | Why |
|---|---|---|
| **Markup** | HTML5 | Zero dependencies, universal |
| **Style** | CSS (custom properties for theming) | Theme-able without framework |
| **Logic** | Vanilla JS — ESM modules (`.mjs`) | Modern, no build step |
| **Components** | Custom Elements (Web Components) | Reusable, encapsulated, framework-free |
| **Demos — protocol/graph** | Inline SVG | Crisp at any scale, style-able |
| **Demos — dense animation** | Canvas 2D | High frame-rate, pixel control |
| **Demos — 3D/GPU** | WebGL / Three.js (opt-in import) | For spatial/ volumetric concepts |
| **Tests** | `node:test` + `node:assert` | Built-in to Node, zero install |
| **Server** | None (open `file://` directly) | Zero infrastructure |
| **Build** | Optional — simple static copy | For GitHub Pages etc. |

### Why no framework

Frameworks assume a single-page app with client-side routing. This is a **course** — mostly static pages the learner navigates with browser-native navigation. View Transitions (`document.startViewTransition()`) work on `file://` and provide smooth cross-page animation without any framework or server.

### Why no server by default

HTML files opened directly in a browser (`file://`) support everything a lesson needs: CSS, JS, SVG, Canvas, WebGL, Web Components, View Transitions. A static server is only needed when:
- The lesson uses `fetch()` to load source files at runtime (e.g. `<source-code>` fetching a `.mjs` file)
- A popup window needs parent-child communication via `postMessage`

Add a server only when one of those triggers. When you do, `npx serve lessons/` is usually enough.

## Source Modules vs Inline Scripts

Decide whether to write a source module (`src/`) based on the concept:

| Write a source module when... | Keep it inline when... |
|---|---|
| The concept has a runnable algorithm (queue, consensus, state machine) | The demo is pure visualization (protocol flow, architecture diagram) |
| The learner will modify or extend the code | The code is glue, buttons, and event wiring |
| Multiple lessons reference the same logic | It's a one-off demo for this lesson only |
| You want `node --test` to verify behavior | The concept is better verified by visual inspection |

Source modules are ESM (`.mjs`), tested with `node:test`. Inline scripts sit in the lesson HTML or as a separate behavior script in `assets/lessons/`.

## Topic-Inspired Theming

Derive the course's visual personality from its subject. Consider not just the domain but also the topic's mascot, metaphor, or cultural associations.

*Example: RabbitMQ's rabbit mascot → warm earth tones, forest greens, burrow-like nested layouts.*
*Example: Git's branch metaphor → tree-inspired greens, bark browns, branch-like hierarchy.*
*Example: Docker's container metaphor → shipping blues, cargo oranges, port-like layout.*

If the topic has a strong visual identity (mascot, logo colors, cultural associations), use it as your palette anchor. If it doesn't, use the domain table as a starting point:

| Topic domain | Colors | Fonts | Layout feel |
|---|---|---|---|
| Networks / protocols | Cool blues, teals, slate | Clean sans-serif, monospace for wire data | Structured, left-aligned, technical |
| Cryptography / security | Dark bg, neon/green accents, amber | Monospace-heavy, terminal aesthetic | Centered narrow columns, code blocks prominent |
| Databases / storage | Deep greens, warm grays | Neutral sans, serif for conceptual sections | Table-heavy, wide content, dense but organized |
| Audio / music / signal | Warm ambers, purples, rich blacks | Rounded sans, playful headings | Generous whitespace, asymmetric panels |
| Physics / 3D / space | Dark blues, cyan, white on dark | Clean sans, light weight | Full-width demos, minimal chrome |
| Biology / chemistry | Greens, earth tones, soft whites | Serif body, clean sans for data | Natural flow, image-forward |
| Systems / OS | Steel blues, grays, muted reds | Technical sans, dense but readable | Compact, vertical rhythm, detail-heavy |
| Frontend / UI | Any — let the learner's taste show | System-ui for authenticity | Demo-as-dominant, minimal text |

The `references/lesson.css` starting stylesheet uses CSS custom properties (`--color-bg`, `--font-body`, etc.) — the agent adjusts these per-topic without restructuring anything.

Rule: **Accessibility over atmosphere.** All theme choices must maintain WCAG contrast ratios. Dark themes need especially careful contrast checking.

## Reference Documents

The `references/` directory contains worked examples and utilities. Read these **before** generating your first lesson:

| File | What it contains | When to read it |
|---|---|---|
| `demo-patterns.md` | SVG protocol flow, Canvas animation, WebGL, REPL sandbox, and multi-modal demo code patterns | Before writing any demo |
| `lesson-components.js` | Web Component definitions: `<lesson-header>`, `<lesson-nav>`, `<knowledge-check>`, `<source-code>` | Before writing the first lesson HTML |
| `lesson.css` | Starting point stylesheet with CSS custom properties for theming | Before writing the first lesson HTML — copy as starting point |
| `accessibility-guide.md` | WCAG checklist: contrast, keyboard nav, reduced motion, labels, screen reader testing | During self-review of each lesson |
| `build-static.mjs` | Optional script to bundle the course for GitHub Pages deployment | At course completion, if deploying |

## Demo Patterns

Every demo MUST pair visual output (SVG/Canvas) with textual output (event log, state table, or status text) in an `aria-live` region.

| Pattern | For | Code |
|---|---|---|
| **SVG Protocol / Architecture** | State machines, message flows, timelines, topology | `references/demo-patterns.md` |
| **Canvas 2D Animation** | Real-time simulation, graph traversal, live data structures | `references/demo-patterns.md` |
| **WebGL / 3D** | Spatial reasoning, volumetric data, 3D visualization | `references/demo-patterns.md` |
| **Interactive Sandbox / REPL** | Command-driven exploration, parameter tuning | `references/demo-patterns.md` |
| **Multi-Modal** | Same state in SVG + Canvas + table simultaneously | `references/demo-patterns.md` |

Read the full code patterns in `references/demo-patterns.md`. The `_example-lesson.html` shows a complete working page with SVG and Canvas demos wired together.

## Web Component System

Copy `references/lesson-components.js` to `assets/lesson-components.js` and include in every lesson. Four components available:

| Component | Purpose | Key attributes |
|---|---|---|
| `<lesson-header>` | Renders content as-is — no extra wrapper | (none — just a semantic wrapper) |
| `<lesson-nav>` | Course home + previous/next links | `home` (path to index.html), `previous`, `next` |
| `<knowledge-check>` | Radio-button quiz with submit + feedback | `correct`, `correct-feedback`, `incorrect-feedback`, `empty-feedback`, `button-label` |
| `<source-code>` | Fetches and displays source files | `src`, `label` |

See `references/lesson-components.js` for full API and usage examples. On `file://`, `<source-code>` falls back to showing the file path instead of fetching.

For smooth cross-page animations, use `document.startViewTransition(() => { location.href = url; })` in your navigation handler. This works on both `file://` and `npx serve` with no configuration needed — it's a browser API, not a server feature.

## Path Conventions

Lessons live in `lessons/NNNN-title.html`. The relative path from a lesson to shared assets is `../assets/lesson.css`. From `index.html` (root), it's `assets/lesson.css` (no `../`).

Tests run as `node --test tests/` from the course root. Source imports from `src/` use bare specifiers like `../src/module.mjs` from a test file in `tests/`.

## Accessibility Requirements (Summary)

See `references/accessibility-guide.md` for full checklist. Minimum bar:
- One `<h1>` per page, sequential heading hierarchy
- Every `<img>`, `<svg>`, `<canvas>` has descriptive text
- Every `<table>` has a `<caption>`
- All form controls have `<label>` elements
- Dynamic content uses `aria-live="polite"` regions
- Respect `prefers-reduced-motion` — disable animations, transitions, scroll-behavior
- Focus indicators visible on all interactive elements
- Color not used as the only differentiator

## Incremental Generation Workflow

The skill generates lessons one at a time in a feedback loop with the learner.

### Step 1: Mission Setup

Interview the learner. Write `MISSION.md`. What do they want to build/understand/do? What's the concrete outcome?

### Step 2: First Lesson

1. Determine the learner's zone of proximal development (ZPD)
2. Design one lesson that teaches ONE concept — tightly scoped, completable quickly
3. Choose a **framing device** — a metaphor or analogy the learner will remember (see Teaching Craft)
4. **Decide the delivery mode:** Will the course open from `file://` or will you use `npx serve lessons/`?
   - If `file://`: inline algorithm code in `<script>` tags AND keep source in `src/` for `node --test`. The `<source-code>` component will show a helpful fallback message.
   - If `npx serve`: you can `import` from `src/` directly and the `<source-code>` component will fetch and display live source.
5. Write the lesson HTML in `lessons/0001-title.html`, including:
   - A framing device (analogy, metaphor)
   - An interactive demo (SVG, Canvas, or Sandbox) **and/or** a real-world exercise (Docker, CLI, code)
   - A tangible payoff that proves the concept matters (interview question, build challenge, or thought experiment)
   - A Pro Tip from real-world experience
   - A challenge question that sets up the next lesson
   - Knowledge check(s) with the `<knowledge-check>` component
6. Write any supporting source module in `src/` and test in `tests/`
7. Update the glossary in `reference/glossary.html` with any new terms introduced this lesson
8. Add a link to the lesson in `index.html` (the course front door)
9. **Verify the lesson:**
   - Opens without console errors
   - All demos render and respond to controls
   - Every `aria-live` region updates during animation
   - Knowledge checks give correct feedback for both right and wrong answers
   - `prefers-reduced-motion` respected
   - `node --test tests/` — all tests pass
   - Full accessibility checklist from `references/accessibility-guide.md`
   - **Style consistency** (if not lesson 1): read the previous lesson — would a learner notice a different teacher wrote this?
10. Add external citations for key claims (at least one link to official docs)
11. Tell the learner how to open the file

### Step 3: Learner Engages

The learner reads the lesson, interacts with the demo, answers knowledge checks, runs tests. They may ask questions or request clarification.

### Step 4: Write Learning Record

After the session, the agent writes a learning record capturing:
- What the learner demonstrated understanding of
- What was challenging or confusing
- How they engaged with the demo (click patterns, questions asked)
- What to adjust for the next lesson

The learning record format is in `LEARNING-RECORD-FORMAT.md`.

### Step 5: Adapt Next Lesson

Read the latest learning record. Adjust the next lesson's approach — different demo style? more scaffolding? skip ahead? deeper exercise? Generate the next lesson.

### Step 6: Repeat

Loop steps 3–5. The course grows organically, shaped by how the learner actually learns.

### Resuming Across Sessions

The learner may return with a different agent or model. The workspace is the canonical handoff document. A new agent discovering an existing workspace must follow this resume protocol before doing anything else:

1. **Read everything.** Read MISSION.md, every learning record, every lesson, NOTES.md, the glossary, RESOURCES.md. Build a complete picture of where the learner is.

2. **Do not regenerate.** Never rewrite existing lessons, the glossary, or MISSION.md unless the mission has changed. Existing files are canonical — preserve them.

3. **Calibrate ZPD.** The learner may have forgotten material since the last session, or the new model may teach differently. Start with a brief calibration: "Last session you covered X. How comfortable do you feel with that now? Want a quick refresher before moving on?" Use their answer to adjust the starting point.

4. **Respect the adaptation signal.** The last learning record contains the Adjust field — what the previous agent planned to change. Honor that direction. Do not restart the course design from scratch.

5. **Document the handoff.** In NOTES.md, record: which agent/model is taking over, what changed in teaching approach (if anything), and any model-specific quirks that future agents should know.

6. **Continue from where it left off.** Generate the next lesson in sequence. The previous agent's last lesson's challenge question tells you what the learner is expecting next. After writing the new lesson, run the Style Consistency check against the previous one before presenting it.

### Batch Generation

Batch generation (all lessons at once) is permitted **only** when the learner explicitly requests the full course. Default is always incremental — one lesson at a time.

When batch-generating, each lesson must still include all Teaching Craft elements (framing device, interview angle, pro tip, challenge question, citations). Write learning records for each lesson as if it was taught, inferring ZPD from the topic structure. Do not treat batch as a shortcut to skip teaching quality.

## Format Files

These format files (in the same directory as SKILL.md) define how workspace documents are structured. Copy their templates into the workspace as needed:

- `MISSION-FORMAT.md` — mission document shape
- `RESOURCES-FORMAT.md` — resources curation format (create lazily when you have a source to cite)
- `LEARNING-RECORD-FORMAT.md` — learning record format with adaptation signal
- `GLOSSARY-FORMAT.md` — glossary definition format (add terms only after they're taught)

## Supporting Files

- `NOTES.md` — agent scratchpad for learner preferences and session notes
- `reference/glossary.html` — canonical terminology, updated every lesson
- `reference/*` — any cheat sheets, syntax references, or algorithm cards the course needs

Create these lazily. The first lesson creates them; subsequent lessons update them.
