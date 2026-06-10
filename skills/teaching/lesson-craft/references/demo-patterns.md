# Demo Patterns

Reference patterns for the four visual demo types. Copy, adapt, combine.

Note: the SVG node in the protocol pattern is used in the SVG protocol flow, and the Canvas snippet is used in the Canvas animation pattern.

---

## 1. SVG Protocol / Architecture Diagram

Use for: state machines, message flows, layered architecture, network topology, timelines.

```html
<figure class="demo-svg" role="img" aria-label="TCP three-way handshake: SYN, SYN-ACK, ACK">
  <svg id="handshake" viewBox="0 0 700 250" aria-hidden="true">
    <!-- nodes -->
    <circle cx="100" cy="125" r="30" class="node client" />
    <text x="100" y="130" text-anchor="middle" class="node-label">Client</text>
    <circle cx="600" cy="125" r="30" class="node server" />
    <text x="600" y="130" text-anchor="middle" class="node-label">Server</text>

    <!-- animated messages -->
    <path id="msg-syn"    d="M130 95 L570 95"   class="arrow" opacity="0" />
    <path id="msg-synack" d="M570 125 L130 125" class="arrow" opacity="0" />
    <path id="msg-ack"    d="M130 155 L570 155" class="arrow" opacity="0" />
  </svg>
  <figcaption class="sr-only">Sequence: Client sends SYN, Server replies SYN-ACK, Client sends ACK</figcaption>
</figure>
```

```css
.node { fill: #e0e7ff; stroke: #6366f1; stroke-width: 2; }
.node-label { font: 14px system-ui; fill: #1e293b; }
.arrow { stroke: #6366f1; stroke-width: 2; marker-end: url(#arrowhead); transition: opacity 0.3s; }
.arrow.active { opacity: 1; }
```

From the behavior script:

```js
async function animateHandshake() {
  const steps = [
    { id: 'msg-syn',    label: 'SYN' },
    { id: 'msg-synack', label: 'SYN-ACK' },
    { id: 'msg-ack',    label: 'ACK' },
  ];
  for (const step of steps) {
    document.getElementById(step.id).classList.add('active');
    log(step.label);
    await delay(800);
  }
}
```

### Best Practices

- Use `<g>` groups for reusable node templates
- Define `<marker id="arrowhead">` in `<defs>` for arrowheads
- Color-code message types (e.g. prepare=blue, commit=green, abort=red)
- Animate via CSS transitions or JS class toggling — keep timing predictable
- Always pair with a text event log for sequential processes

---

## 2. Canvas Dense Animation

Use for: real-time simulations, data structure visualization, graph traversal, physics, streaming data.

```html
<figure class="demo-canvas">
  <canvas id="sim" width="700" height="400" aria-label="Live graph traversal visualization"></canvas>
  <figcaption>
    <div class="event-log" aria-live="polite" id="sim-log">
      Ready. Click "Run" to start traversal.
    </div>
  </figcaption>
  <button id="sim-run">Run</button>
  <button id="sim-reset">Reset</button>
</figure>
```

```js
// behavior script
const canvas = document.getElementById('sim');
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('sim-log');

const nodes = [
  { x: 100, y: 200, label: 'A' },
  { x: 300, y: 80,  label: 'B' },
  { x: 300, y: 320, label: 'C' },
  { x: 500, y: 160, label: 'D' },
  { x: 500, y: 320, label: 'E' },
];
const edges = [[0,1],[0,2],[1,3],[2,3],[2,4],[3,4]];

let visited = new Set();
let current = -1;

function draw() {
  ctx.clearRect(0, 0, 700, 400);
  // edges
  for (const [a,b] of edges) {
    ctx.beginPath();
    ctx.moveTo(nodes[a].x, nodes[a].y);
    ctx.lineTo(nodes[b].x, nodes[b].y);
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();
  }
  // nodes
  for (let i = 0; i < nodes.length; i++) {
    ctx.beginPath();
    ctx.arc(nodes[i].x, nodes[i].y, 18, 0, Math.PI * 2);
    ctx.fillStyle = visited.has(i) ? '#22c55e'
      : i === current ? '#ef4444' : '#e2e8f0';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nodes[i].label, nodes[i].x, nodes[i].y);
  }
}

async function runTraversal() {
  visited.clear();
  for (let i = 0; i < nodes.length; i++) {
    current = i;
    draw();
    logEl.textContent = `Visiting node ${nodes[i].label}`;
    await new Promise(r => setTimeout(r, 600));
    visited.add(i);
  }
  current = -1;
  draw();
  logEl.textContent = 'Traversal complete.';
}
```

### Canvas + SVG Hybrid

For complex demos, render static structure in SVG (declarative, style-able) and overlay dynamic animation on a transparent Canvas. The SVG layer provides accessibility hooks, the Canvas layer provides frame-level animation control.

---

## 3. WebGL / 3D

Use for: spatial/volumetric concepts, large network topologies, molecular/structural visualization. Only when Canvas 2D is insufficient.

Import Three.js as an ES module:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
  }
}
</script>
<script type="module">
import * as THREE from 'three';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 700/400, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('webgl-canvas') });
// ... standard Three.js setup
</script>
```

Always include a fallback: Canvas 2D or SVG version displayed when WebGL context creation fails.

---

## 4. Interactive Sandbox / REPL

Use for: command-driven exploration where the user types or clicks to trigger state changes.

```html
<div class="sandbox">
  <div class="sandbox-panels">
    <section class="sandbox-panel" aria-label="State">
      <h3>Current State</h3>
      <pre id="sandbox-state">Waiting for input...</pre>
    </section>
    <section class="sandbox-panel" aria-label="Log">
      <h3>Event Log</h3>
      <div id="sandbox-log" aria-live="polite"></div>
    </section>
  </div>
  <form class="sandbox-input" id="sandbox-form">
    <label for="sandbox-cmd">Command:</label>
    <input type="text" id="sandbox-cmd" placeholder="Type a command..." list="sandbox-hints">
    <datalist id="sandbox-hints">
      <option value="BEGIN tx1">
      <option value="WRITE tx1 key=value">
      <option value="COMMIT tx1">
    </datalist>
    <button type="submit">Run</button>
    <button type="button" id="sandbox-reset">Reset</button>
  </form>
</div>
```

```js
let state = {};
const stateEl = document.getElementById('sandbox-state');
const logEl = document.getElementById('sandbox-log');

document.getElementById('sandbox-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('sandbox-cmd');
  const cmd = input.value.trim();
  if (!cmd) return;
  processCommand(cmd);
  input.value = '';
});

function processCommand(cmd) {
  const parts = cmd.split(/\s+/);
  const action = parts[0].toUpperCase();
  switch (action) {
    case 'BEGIN':
      state.currentTx = parts[1];
      updateUI(`BEGIN ${parts[1]}`);
      break;
    // ...
  }
}

function updateUI(msg) {
  stateEl.textContent = JSON.stringify(state, null, 2);
  const entry = document.createElement('div');
  entry.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
  logEl.prepend(entry);
}
```

---

## 5. Multi-Modal Demo

Render the same state in SVG (structural diagram), Canvas (animated simulation), and a plain HTML table (text). Keeps all three in sync from one state object.

```html
<div class="demo-panels">
  <div class="demo-panel">
    <h3>Diagram</h3>
    <svg id="mm-svg" viewBox="0 0 400 200" aria-label="State diagram"></svg>
  </div>
  <div class="demo-panel">
    <h3>Animation</h3>
    <canvas id="mm-canvas" width="400" height="200" aria-label="Same state, animated"></canvas>
  </div>
  <div class="demo-panel">
    <h3>State Table</h3>
    <table id="mm-table">
      <caption>Current system state</caption>
      <thead><tr><th>Node</th><th>Status</th></tr></thead>
      <tbody id="mm-tbody"></tbody>
    </table>
  </div>
</div>
```

```js
function renderAll(state) {
  renderSVG(state);    // update SVG element attributes
  renderCanvas(state); // clear + redraw canvas
  renderTable(state);  // update table rows
}
```
