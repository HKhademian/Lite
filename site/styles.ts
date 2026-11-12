/** Stylesheet for the static Lite public showcase site and playground, emitted to dist/site/style.css. */

export const siteCss = `:root {
  --bg: #F5F3EE;
  --surface: #ECE8DF;
  --surface-elevated: #FBFAF7;
  --border: #DDD7CB;
  --ink: #101113;
  --ink-muted: #56585E;
  --accent: #C97B14;
  --accent-soft: rgba(201, 123, 20, 0.12);
  --code-bg: #FBFAF7;
  --tok-keyword: #9E4B08;
  --tok-type: #0D6678;
  --tok-string: #2C6E31;
  --tok-number: #7A3E9D;
  --tok-comment: #6E7178;
  --tok-op: #8B4513;
  --radius: 10px;
  --font-sans: ui-sans-serif, -apple-system, 'Helvetica Neue', sans-serif;
  --font-mono: 'SF Mono', ui-monospace, monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0B0C0E;
    --surface: #1A1D22;
    --surface-elevated: #131519;
    --border: #252930;
    --ink: #F2F0EA;
    --ink-muted: #9EA2AC;
    --accent: #F0B45A;
    --accent-soft: rgba(240, 180, 90, 0.14);
    --code-bg: #131519;
    --tok-keyword: #F0B45A;
    --tok-type: #6EC4D8;
    --tok-string: #89C983;
    --tok-number: #C69AE8;
    --tok-comment: #7B808C;
    --tok-op: #E09F5A;
  }
}

:root[data-theme="dark"] {
  --bg: #0B0C0E;
  --surface: #1A1D22;
  --surface-elevated: #131519;
  --border: #252930;
  --ink: #F2F0EA;
  --ink-muted: #9EA2AC;
  --accent: #F0B45A;
  --accent-soft: rgba(240, 180, 90, 0.14);
  --code-bg: #131519;
  --tok-keyword: #F0B45A;
  --tok-type: #6EC4D8;
  --tok-string: #89C983;
  --tok-number: #C69AE8;
  --tok-comment: #7B808C;
  --tok-op: #E09F5A;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-elevated);
  color: var(--ink-muted);
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
}
.theme-toggle:hover {
  color: var(--accent);
  border-color: var(--accent);
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  min-height: 100svh;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

body {
  display: flex;
  flex-direction: column;
}

main {
  flex: 1 0 auto;
  width: 100%;
}

a {
  color: var(--accent);
  text-decoration: none;
}
a:hover { text-decoration: underline; }

.container {
  width: min(1240px, 100% - 32px);
  margin-inline: auto;
}

/* Header */
.site-header {
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
  flex: 0 0 auto;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 58px;
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
  height: 24px;
  width: auto;
  display: block;
}
.brand-link .brand-l,
.prose-lite .brand-l {
  color: var(--accent);
}
.prose-lite {
  font-weight: 600;
  color: var(--ink);
}
.brand-badge {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.14rem 0.48rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  font-size: 0.94rem;
  font-weight: 500;
}
.site-nav a { color: var(--ink-muted); }
.site-nav a:hover,
.site-nav a.active { color: var(--ink); text-decoration: none; }

/* Hero */
.hero {
  padding: 3rem 0 2.25rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 2.5rem;
  align-items: start;
}
@media (max-width: 860px) {
  .hero { grid-template-columns: 1fr; padding: 2rem 0 1.5rem; }
}
.hero-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.85rem;
}
.hero-display svg {
  height: clamp(34px, 4.2vw, 46px);
  width: auto;
  display: block;
}
.hero-display .brand-l { color: var(--accent); }
.hero h1 {
  font-size: clamp(2rem, 3.8vw, 2.85rem);
  line-height: 1.12;
  letter-spacing: -0.02em;
  margin: 0;
}
.hero-lead {
  font-size: 1.1rem;
  color: var(--ink-muted);
  margin: 0 0 1.4rem;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.4rem;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
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
  color: #0B0C0E;
}
.btn-primary:hover { filter: brightness(1.06); }

.quickstart {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.85rem;
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
  padding: 2.25rem 0;
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
  font-size: 1.4rem;
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

/* Full-screen Mini-style Playground Workbench */
.playground-page {
  height: 100svh;
  overflow: hidden;
}
.playground-page .container,
.playground-main {
  width: min(1680px, 100% - 32px);
  margin-inline: auto;
}
.playground-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 10px 0;
}
.workbench {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
}
@media (max-width: 900px) {
  .playground-page { height: auto; overflow: auto; }
  .workbench { grid-template-columns: 1fr; }
}
.pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-elevated);
  overflow: hidden;
}
.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.84rem;
}
.sample-picker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.pg-select {
  font-family: inherit;
  font-size: 0.86rem;
  padding: 0.35rem 0.6rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink);
  max-width: 240px;
}
.pg-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.pg-editor-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 220px;
  background: var(--code-bg);
  overflow: hidden;
}
.pg-editor-pre,
.pg-editor-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 16px;
  border: 0;
  font-family: var(--font-mono);
  font-size: 0.86rem;
  line-height: 1.55;
  letter-spacing: 0;
  font-variant-ligatures: none;
  tab-size: 4;
  white-space: pre;
  overflow-wrap: normal;
}
.pg-editor-pre {
  overflow: hidden;
  pointer-events: none;
}
.pg-editor-pre code {
  font: inherit;
  white-space: inherit;
}
.pg-editor-input {
  outline: none;
  resize: none;
  overflow: auto;
  background: transparent;
  color: transparent;
  -webkit-text-fill-color: transparent;
  caret-color: var(--ink);
}
.pg-io-strip {
  border-top: 1px solid var(--border);
  padding: 0.5rem 0.85rem;
  background: var(--surface);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
}
.pg-io-field {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--ink-muted);
  font-family: var(--font-mono);
}
.pg-io-field input {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  padding: 0.22rem 0.45rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink);
  min-width: 140px;
}

.pg-tabs {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}
.pg-tab {
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.28rem 0.65rem;
  border-radius: 6px;
  cursor: pointer;
}
.pg-tab:hover { color: var(--ink); }
.pg-tab[aria-selected="true"] {
  background: var(--surface-elevated);
  border-color: var(--border);
  color: var(--ink);
}
.pg-tab[hidden] { display: none; }

.pg-status {
  font-size: 0.78rem;
  color: var(--ink-muted);
  font-family: var(--font-mono);
}
.pg-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
.pg-panel[hidden] { display: none; }
.pg-canvas-wrap {
  flex: 1 1 auto;
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
  background: #0B0C0E;
  image-rendering: pixelated;
  max-width: 100%;
}

/* Syntax tokens */
.tok-keyword { color: var(--tok-keyword); }
.tok-type { color: var(--tok-type); }
.tok-string { color: var(--tok-string); }
.tok-number { color: var(--tok-number); }
.tok-comment { color: var(--tok-comment); font-style: italic; }
.tok-op { color: var(--tok-op); }

/* Footer */
.site-footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--border);
  padding: 0.6rem 0;
  color: var(--ink-muted);
  font-size: 0.8rem;
}
.footer-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 1.25rem;
  align-items: center;
}
.commit-hash {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  color: var(--ink-muted);
  word-break: break-all;
}
.commit-hash strong {
  color: var(--ink);
}
`;
