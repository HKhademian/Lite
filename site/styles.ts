/** Stylesheet for the static Lite public showcase site and playground, emitted to dist/site/style.css. */

export const siteCss = `:root {
  --bg: #fdfcfa;
  --surface: #f5f2eb;
  --surface-elevated: #ffffff;
  --border: #e4ded3;
  --ink: #1e1b16;
  --ink-muted: #5e574c;
  --accent: #c97b14;
  --accent-soft: rgba(201, 123, 20, 0.12);
  --code-bg: #f6f3ec;
  --tok-keyword: #9e4b08;
  --tok-type: #0d6678;
  --tok-string: #2c6e31;
  --tok-number: #7a3e9d;
  --tok-comment: #7c7467;
  --tok-op: #8b4513;
  --radius: 10px;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14120f;
    --surface: #1c1915;
    --surface-elevated: #221e19;
    --border: #322c24;
    --ink: #f3efe8;
    --ink-muted: #aba294;
    --accent: #f0b45a;
    --accent-soft: rgba(240, 180, 90, 0.14);
    --code-bg: #181511;
    --tok-keyword: #f0b45a;
    --tok-type: #6ec4d8;
    --tok-string: #89c983;
    --tok-number: #c69ae8;
    --tok-comment: #857d70;
    --tok-op: #e09f5a;
  }
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--accent);
  text-decoration: none;
}
a:hover { text-decoration: underline; }

.container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 1.25rem;
}

/* Header */
.site-header {
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 64px;
}
.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--ink);
  text-decoration: none;
}
.brand-link:hover { text-decoration: none; }
.brand-link svg {
  height: 26px;
  width: auto;
  display: block;
}
.brand-link .brand-l,
.brand-link .brand-dot {
  color: var(--accent);
}
.brand-badge {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  font-size: 0.95rem;
  font-weight: 500;
}
.site-nav a { color: var(--ink-muted); }
.site-nav a:hover,
.site-nav a.active { color: var(--ink); text-decoration: none; }

/* Hero */
.hero {
  padding: 3.5rem 0 2.5rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 2.5rem;
  align-items: start;
}
@media (max-width: 860px) {
  .hero { grid-template-columns: 1fr; padding: 2.25rem 0 1.75rem; }
}
.hero h1 {
  font-size: clamp(2.1rem, 4vw, 3rem);
  line-height: 1.12;
  letter-spacing: -0.02em;
  margin: 0 0 1rem;
}
.hero-lead {
  font-size: 1.12rem;
  color: var(--ink-muted);
  margin: 0 0 1.5rem;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.58rem 1.1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.92rem;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink);
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
}
.btn:hover { text-decoration: none; border-color: var(--accent); }
.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #14120f;
}
.btn-primary:hover { filter: brightness(1.06); }

.quickstart {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.86rem;
  overflow-x: auto;
}
.quickstart pre { margin: 0; }

/* Code Panels & Cards */
.code-card {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.code-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
}
.code-card-title { font-weight: 600; }
.code-card-meta { color: var(--ink-muted); font-family: var(--font-mono); font-size: 0.78rem; }

pre.code-block {
  margin: 0;
  padding: 1rem;
  background: var(--code-bg);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.5;
  overflow-x: auto;
  flex: 1;
}
.output-block {
  border-top: 1px solid var(--border);
  padding: 0.75rem 1rem;
  background: var(--surface-elevated);
  font-family: var(--font-mono);
  font-size: 0.83rem;
}
.output-label {
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-muted);
  margin-bottom: 0.3rem;
}
.output-block pre { margin: 0; white-space: pre-wrap; }

.sample-foot {
  border-top: 1px solid var(--border);
  padding: 0.55rem 1rem;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.86rem;
  font-weight: 600;
}

/* Pillars */
.section {
  padding: 2.5rem 0;
  border-top: 1px solid var(--border);
}
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.section-head h2 {
  margin: 0;
  font-size: 1.45rem;
  letter-spacing: -0.01em;
}
.section-note {
  color: var(--ink-muted);
  margin: 0 0 1.25rem;
}

.pillars {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
}
@media (max-width: 760px) {
  .pillars { grid-template-columns: 1fr; }
}
.pillar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.15rem 1.25rem;
}
.pillar h3 {
  margin: 0 0 0.45rem;
  font-size: 1.05rem;
}
.pillar p {
  margin: 0;
  font-size: 0.94rem;
  color: var(--ink-muted);
}

/* Sample Grid */
.sample-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}
@media (max-width: 860px) {
  .sample-grid { grid-template-columns: 1fr; }
}
.sample-note {
  margin: 0;
  padding: 0.6rem 1rem;
  font-size: 0.88rem;
  color: var(--ink-muted);
  background: var(--surface-elevated);
  border-bottom: 1px solid var(--border);
}

/* Playground Workbench */
.pg-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 0;
}
.pg-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}
.pg-select {
  font-family: inherit;
  font-size: 0.92rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink);
  min-width: 240px;
}
.pg-status {
  font-size: 0.85rem;
  color: var(--ink-muted);
  font-family: var(--font-mono);
}

.pg-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}
@media (max-width: 900px) {
  .pg-grid { grid-template-columns: 1fr; }
}
.pg-pane {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 460px;
}
.pg-pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.pg-tabs {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.pg-tab {
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  padding: 0.32rem 0.7rem;
  border-radius: 6px;
  cursor: pointer;
}
.pg-tab:hover { color: var(--ink); }
.pg-tab[aria-selected="true"] {
  background: var(--surface-elevated);
  border-color: var(--border);
  color: var(--ink);
}
.pg-io-strip {
  border-top: 1px solid var(--border);
  padding: 0.6rem 0.85rem;
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--ink-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.pg-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
.pg-panel[hidden] { display: none; }
.pg-canvas-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem;
  background: var(--code-bg);
}
.pg-canvas {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #14120f;
  image-rendering: pixelated;
  max-width: 100%;
}

/* Syntax tokens */
.tok-keyword { color: var(--tok-keyword); font-weight: 600; }
.tok-type { color: var(--tok-type); }
.tok-string { color: var(--tok-string); }
.tok-number { color: var(--tok-number); }
.tok-comment { color: var(--tok-comment); font-style: italic; }
.tok-op { color: var(--tok-op); }

/* Footer */
.site-footer {
  border-top: 1px solid var(--border);
  padding: 2rem 0;
  color: var(--ink-muted);
  font-size: 0.88rem;
}
.footer-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}
.commit-pill {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--ink);
}
`;
