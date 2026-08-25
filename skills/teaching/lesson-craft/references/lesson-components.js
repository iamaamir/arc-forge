/**
 * lesson-craft Web Components
 *
 * Copy to assets/lesson-components.js and include in every lesson:
 *   <link rel="stylesheet" href="../assets/lesson.css">
 *   <script defer src="../assets/lesson-components.js"></script>
 */

// ─── Safe registration ───────────────────────────────────
function define(tag, ctor) {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
}

// ─── Shared helpers ──────────────────────────────────────
function optionalLink(href, className, rel, label) {
  if (!href) return '';
  return `<a href="${href}" class="${className}" rel="${rel}">${label}</a>`;
}

// ─── <lesson-header> ─────────────────────────────────────
define('lesson-header', class extends HTMLElement {
  connectedCallback() {
    const slot = resolveSlot(this);
    if (slot) this.replaceWith(slot);
  }
});

function resolveSlot(el) {
  return el.querySelector(':scope > [slot]') || el.firstElementChild;
}

// ─── <lesson-nav> ────────────────────────────────────────
define('lesson-nav', class extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="lesson-nav" aria-label="Lesson navigation">
        ${optionalLink(this.getAttribute('home'), 'nav-home', 'home', '🏠 Course Home')}
        <span class="nav-prev-next">
          ${optionalLink(this.getAttribute('previous'), 'nav-prev', 'prev', '← Previous')}
          ${optionalLink(this.getAttribute('next'), 'nav-next', 'next', 'Next →')}
        </span>
      </nav>
    `;
  }
});

// ─── <knowledge-check> ───────────────────────────────────
define('knowledge-check', class extends HTMLElement {
  connectedCallback() {
    const form = this.querySelector('form');
    if (!form) return;
    attachKnowledgeCheck(this, form);
  }
});

function attachKnowledgeCheck(el, form) {
  form.appendChild(createSubmitButton(el));
  form.appendChild(createFeedbackParagraph());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showKnowledgeFeedback(form, el);
  });
}

function createSubmitButton(el) {
  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.textContent = feedbackAttr(el, 'button-label', 'Check');
  return btn;
}

function createFeedbackParagraph() {
  const feedback = document.createElement('p');
  feedback.className = 'knowledge-feedback';
  feedback.setAttribute('aria-live', 'polite');
  return feedback;
}

function showKnowledgeFeedback(form, el) {
  const checked = form.querySelector('input[type="radio"]:checked');
  const feedback = form.querySelector('.knowledge-feedback');
  feedback.textContent = knowledgeFeedbackText(checked, el);
}

function knowledgeFeedbackText(checked, el) {
  if (!checked) return feedbackAttr(el, 'empty-feedback', 'Select an option first.');
  return matchedAnswerText(checked.value, el);
}

function matchedAnswerText(value, el) {
  if (value === el.getAttribute('correct')) return feedbackAttr(el, 'correct-feedback', 'Correct!');
  return feedbackAttr(el, 'incorrect-feedback', 'Not quite.');
}

function feedbackAttr(el, name, fallback) {
  return el.getAttribute(name) || fallback;
}

// ─── <source-code> ───────────────────────────────────────
// Fetches source file via HTTP. On file://, shows instructions.
define('source-code', class extends HTMLElement {
  async connectedCallback() {
    await renderSourceElement(this);
  }
});

async function renderSourceElement(el) {
  const src = el.getAttribute('src');
  const figure = createSourceFigure(el);
  el.append(figure);
  if (!src) return;
  await loadSourceInto(figure.querySelector('code'), src);
}

function createSourceFigure(el) {
  const label = feedbackAttr(el, 'label', el.getAttribute('src'));
  const figure = document.createElement('figure');
  figure.className = 'source-code';
  figure.innerHTML = `<figcaption>${label}</figcaption><pre><code>Loading source...</code></pre>`;
  return figure;
}

async function loadSourceInto(code, src) {
  try {
    code.textContent = await fetchSourceText(src);
  } catch {
    code.textContent =
      `[Open ${src} to view source — file:// fetches not supported by browser policy]`;
  }
}

async function fetchSourceText(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
