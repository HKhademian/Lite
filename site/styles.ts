/** Stylesheet for the static Lite public showcase site and playground, emitted to dist/site/style.css. */

export const siteCss = `:root {
  color-scheme: light dark;
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

:root[data-theme="light"] {
  color-scheme: light;
}

:root[data-theme="dark"] {
  color-scheme: dark;
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
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
  line-height: 1;
  transition: box-shadow 0.25s ease, color 0.2s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.theme-toggle:hover {
  color: var(--accent);
  transform: translateY(-1px) scale(1.12);
}
.theme-toggle:active {
  transform: translateY(0) scale(0.92);
}
.theme-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}
.theme-toggle .theme-icon {
  display: block;
  width: 100%;
  height: 100%;
  transition: filter 0.25s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.theme-toggle:hover .icon-auto {
  transform: rotate(15deg);
}
.theme-toggle:hover .icon-sun {
  transform: rotate(18deg);
}
.theme-toggle:hover .icon-moon {
  transform: rotate(-12deg);
}
.theme-toggle .icon-sun,
.theme-toggle .icon-moon {
  display: none;
}
.theme-toggle .icon-auto {
  display: block;
}
.theme-toggle.theme-toggle-shine {
  --switch-shine-size: 26px;
  --switch-shine-spread: 4px;
  --switch-shine-icon-glow: 8px;
  --switch-color: #D9B991;
  --switch-shine-core: rgba(254, 240, 138, 0.72);
  --switch-shine-mid: rgba(251, 191, 36, 0.5);
  --switch-shine-outer: rgba(147, 197, 253, 0.45);
  --switch-shadow: -3px -3px 11px var(--switch-shine-mid), 3px 3px 11px var(--switch-shine-outer), 0 0 var(--switch-shine-size) var(--switch-shine-spread) rgba(217, 185, 145, 0.28);
  --switch-shadow-hover: -4px -4px 15px var(--switch-shine-core), 4px 4px 15px rgba(191, 219, 254, 0.72), 0 0 calc(var(--switch-shine-size) * 1.35) calc(var(--switch-shine-spread) + 3px) rgba(217, 185, 145, 0.42);
  --switch-glow: drop-shadow(0 0 var(--switch-shine-icon-glow) rgba(217, 185, 145, 0.55));
  color: var(--switch-color);
  box-shadow: var(--switch-shadow);
}
.theme-toggle.theme-toggle-shine .theme-icon {
  filter: var(--switch-glow);
}
.theme-toggle.theme-toggle-shine:hover {
  color: var(--switch-color);
  box-shadow: var(--switch-shadow-hover);
  transform: translateY(-1px) scale(1.14);
  animation: lite-shine-pulse 1.8s ease-in-out infinite;
}
.theme-toggle.theme-toggle-shine:active {
  transform: translateY(0) scale(0.92);
  animation: none;
}
@keyframes lite-shine-pulse {
  0%, 100% {
    box-shadow: var(--switch-shadow-hover);
  }
  50% {
    box-shadow: 0 0 18px var(--switch-shine-core), 0 0 calc(var(--switch-shine-size) * 1.6) calc(var(--switch-shine-spread) + 5px) var(--switch-shine-mid);
  }
}
@keyframes lite-orb-rise {
  0% {
    opacity: 0.45;
    transform: scale(0.76) rotate(-24deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}
:root[data-theme-switching="true"] .theme-toggle .theme-icon {
  animation: lite-orb-rise 0.34s cubic-bezier(0.34, 1.56, 0.64, 1);
}
:root[data-theme-switching="true"] body,
:root[data-theme-switching="true"] .site-header,
:root[data-theme-switching="true"] .quickstart,
:root[data-theme-switching="true"] .quickstart-head,
:root[data-theme-switching="true"] .code-card,
:root[data-theme-switching="true"] .pillar,
:root[data-theme-switching="true"] .btn {
  transition: background-color 0.28s ease, color 0.22s ease, border-color 0.28s ease, box-shadow 0.28s ease;
}
@media (prefers-reduced-motion: reduce) {
  .theme-toggle,
  .theme-toggle .theme-icon {
    transition: none;
  }
  .theme-toggle:hover,
  .theme-toggle:active,
  .theme-toggle:hover .icon-auto,
  .theme-toggle:hover .icon-sun,
  .theme-toggle:hover .icon-moon,
  .theme-toggle.theme-toggle-shine:hover,
  :root[data-theme-switching="true"] .theme-toggle .theme-icon {
    transform: none;
    animation: none;
  }
  :root[data-theme-switching="true"] body,
  :root[data-theme-switching="true"] .site-header,
  :root[data-theme-switching="true"] .quickstart,
  :root[data-theme-switching="true"] .quickstart-head,
  :root[data-theme-switching="true"] .code-card,
  :root[data-theme-switching="true"] .pillar,
  :root[data-theme-switching="true"] .btn {
    transition: none;
  }
}
:root[data-theme="light"] .theme-toggle.theme-toggle-shine {
  --switch-color: #D97706;
  --switch-shine-core: rgba(254, 240, 138, 0.9);
  --switch-shine-mid: rgba(251, 191, 36, 0.62);
  --switch-shine-outer: rgba(245, 158, 11, 0.36);
  --switch-shadow: 0 0 10px var(--switch-shine-mid), 0 0 var(--switch-shine-size) var(--switch-shine-spread) var(--switch-shine-outer);
  --switch-shadow-hover: 0 0 14px var(--switch-shine-core), 0 0 calc(var(--switch-shine-size) * 1.35) calc(var(--switch-shine-spread) + 3px) var(--switch-shine-mid);
  --switch-glow: drop-shadow(0 0 var(--switch-shine-icon-glow) var(--switch-shine-mid));
}
:root[data-theme="light"] .theme-toggle .icon-auto,
:root[data-theme="light"] .theme-toggle .icon-moon {
  display: none;
}
:root[data-theme="light"] .theme-toggle .icon-sun {
  display: block;
}
:root[data-theme="dark"] .theme-toggle.theme-toggle-shine {
  --switch-color: #D8E8FF;
  --switch-shine-core: rgba(239, 246, 255, 0.78);
  --switch-shine-mid: rgba(147, 197, 253, 0.56);
  --switch-shine-outer: rgba(191, 219, 254, 0.32);
  --switch-shadow: 0 0 10px var(--switch-shine-mid), 0 0 var(--switch-shine-size) var(--switch-shine-spread) var(--switch-shine-outer);
  --switch-shadow-hover: 0 0 14px var(--switch-shine-core), 0 0 calc(var(--switch-shine-size) * 1.35) calc(var(--switch-shine-spread) + 3px) var(--switch-shine-mid);
  --switch-glow: drop-shadow(0 0 var(--switch-shine-icon-glow) var(--switch-shine-mid));
}
:root[data-theme="dark"] .theme-toggle .icon-auto,
:root[data-theme="dark"] .theme-toggle .icon-sun {
  display: none;
}
:root[data-theme="dark"] .theme-toggle .icon-moon {
  display: block;
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
  gap: 0.95rem;
  font-size: 0.91rem;
  font-weight: 500;
  flex-wrap: wrap;
}
.site-nav a { color: var(--ink-muted); white-space: nowrap; }
.site-nav a:hover,
.site-nav a.active { color: var(--ink); text-decoration: none; }
.search-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.22rem 0.55rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  line-height: 1.3;
}
.search-trigger:hover {
  color: var(--ink);
  border-color: var(--accent);
}
.search-trigger kbd {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 0.04rem 0.32rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
}
@media (max-width: 960px) {
  .header-inner {
    flex-wrap: wrap;
    padding: 0.55rem 0;
    gap: 0.55rem 0.75rem;
  }
  .site-nav {
    gap: 0.5rem 0.85rem;
    font-size: 0.88rem;
  }
}
@media (max-width: 640px) {
  .header-inner {
    flex-wrap: wrap;
    padding: 0.55rem 0;
    gap: 0.55rem 0.75rem;
  }
  .site-nav {
    flex-wrap: wrap;
    gap: 0.55rem 0.9rem;
    font-size: 0.9rem;
  }
}

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
  --shell-bg: #FBFAF7;
  --shell-head: #ECE8DF;
  --shell-border: #D5CEC0;
  --shell-ink: #17191E;
  --shell-muted: #646873;
  --shell-prompt: #C97B14;
  --shell-cmd: #0D6678;
  background: var(--shell-bg);
  border: 1px solid var(--shell-border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(16, 17, 19, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.quickstart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.85rem;
  background: var(--shell-head);
  border-bottom: 1px solid var(--shell-border);
}
.quickstart-title {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}
.quickstart-dots {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.quickstart-dots span {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  opacity: 0.85;
}
.quickstart-dots span:nth-child(1) { background: #FF5F56; }
.quickstart-dots span:nth-child(2) { background: #FFBD2E; }
.quickstart-dots span:nth-child(3) { background: #27C93F; }
.quickstart-label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--shell-muted);
}
.quickstart-copy {
  appearance: none;
  border: 1px solid var(--shell-border);
  border-radius: 6px;
  background: transparent;
  color: var(--shell-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  padding: 0.28rem 0.55rem;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}
.quickstart-copy:hover {
  color: var(--shell-ink);
  border-color: var(--shell-prompt);
}
.quickstart-copy.copied {
  color: var(--shell-prompt);
  border-color: var(--shell-prompt);
}
.quickstart-body {
  margin: 0;
  padding: 0.85rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.65;
  color: var(--shell-ink);
  overflow-x: auto;
}
.quickstart-body code {
  display: block;
}
.shell-line::before {
  content: "$ ";
  color: var(--shell-prompt);
  font-weight: 600;
  user-select: none;
  -webkit-user-select: none;
}
.shell-cmd {
  color: var(--shell-cmd);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .quickstart {
    --shell-bg: #0E1015;
    --shell-head: #151820;
    --shell-border: #2A303C;
    --shell-ink: #ECEAE4;
    --shell-muted: #8B93A3;
    --shell-prompt: #BFD7FF;
    --shell-cmd: #F0B45A;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }
}
:root[data-theme="dark"] .quickstart {
  --shell-bg: #0E1015;
  --shell-head: #151820;
  --shell-border: #2A303C;
  --shell-ink: #ECEAE4;
  --shell-muted: #8B93A3;
  --shell-prompt: #BFD7FF;
  --shell-cmd: #F0B45A;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

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

details.gallery-code {
  border-top: 1px solid var(--border);
  background: var(--surface);
}
details.gallery-code summary {
  cursor: pointer;
  padding: 0.45rem 1rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-muted);
  user-select: none;
}
details.gallery-code summary:hover {
  color: var(--ink);
}
details.gallery-code pre.code-block {
  border-top: 1px solid var(--border);
}

/* Pillars & Gallery */
.gallery-jumps {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.gallery-jump {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.72rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-elevated);
  color: var(--ink);
  font-size: 0.84rem;
  font-weight: 500;
}
.gallery-jump:hover {
  text-decoration: none;
  border-color: var(--accent);
  color: var(--accent);
}
.gallery-jump span {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--ink-muted);
}
.gallery-tier-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.gallery-tier-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-muted);
  margin-right: 0.25rem;
}
.gallery-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.14rem 0.48rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink-muted);
  font-size: 0.72rem;
  font-weight: 600;
}
.play-preview {
  background: #080b14;
  border-bottom: 1px solid var(--border);
  padding: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.play-preview-svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 185px;
  border-radius: 6px;
}
.section {
  padding: 2.25rem 0;
  border-top: 1px solid var(--border);
  scroll-margin-top: 76px;
}
.code-card {
  scroll-margin-top: 76px;
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
  --pg-split: 50%;
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(200px, calc(var(--pg-split) - 5px)) 10px minmax(200px, 1fr);
  gap: 0;
  min-height: 0;
}
.pg-split {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
  user-select: none;
  outline: none;
}
.pg-split::before {
  content: "";
  width: 3px;
  height: 36px;
  border-radius: 999px;
  background: var(--border);
  transition: background-color 0.16s ease, height 0.16s ease;
}
.pg-split:hover::before,
.pg-split:focus-visible::before,
.pg-split.dragging::before {
  background: var(--accent);
  height: 52px;
}
body.pg-resizing {
  cursor: col-resize;
  user-select: none;
}
@media (max-width: 900px) {
  .playground-page { height: auto; overflow: auto; }
  .workbench { grid-template-columns: 1fr; gap: 10px; }
  .pg-split { display: none; }
  .pg-editor-wrap { min-height: 280px; }
  .pg-panel { min-height: 240px; }
  .pg-canvas-wrap { min-height: 240px; }
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
.pg-copy-btn,
.pg-pause-btn {
  appearance: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-elevated);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1;
  padding: 0.28rem 0.55rem;
  cursor: pointer;
}
.pg-pause-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
}
.pg-copy-btn:hover,
.pg-pause-btn:hover {
  color: var(--ink);
  border-color: var(--accent);
}
.pg-copy-btn.copied,
.pg-pause-btn[aria-pressed="true"] {
  color: var(--accent);
  border-color: var(--accent);
}
.pg-pause-btn .pg-icon-paused { display: none; }
.pg-pause-btn[aria-pressed="true"] .pg-icon-playing { display: none; }
.pg-pause-btn[aria-pressed="true"] .pg-icon-paused { display: block; }
.pg-copy-btn[hidden],
.pg-pause-btn[hidden] { display: none; }
.pg-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
.pg-panel[hidden] { display: none; }
.code-modes {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.9rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.code-modes[hidden] { display: none; }
.code-mode-btn {
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-muted);
  font-family: var(--font-sans);
  font-size: 0.78rem;
  padding: 0.22rem 0.6rem;
  border-radius: 5px;
  cursor: pointer;
}
.code-mode-btn:hover {
  color: var(--ink);
}
.code-mode-btn[aria-pressed="true"] {
  color: var(--accent);
  border-color: var(--border);
  background: var(--code-bg);
}
.pg-canvas-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  background: #0B0C0E;
}
.pg-canvas-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.78rem;
  color: var(--ink-muted);
}
.pg-canvas-title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--ink);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pg-canvas-tools {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
  white-space: nowrap;
}
.pg-sep {
  color: var(--ink-muted);
  opacity: 0.65;
}
.pg-mute-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface-elevated);
  color: var(--ink);
  cursor: pointer;
}
.pg-mute-btn svg {
  display: block;
  width: 14px;
  height: 14px;
}
.pg-mute-btn .pg-sound-slash {
  display: none;
}
.pg-mute-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.pg-mute-btn[aria-pressed="true"] {
  color: var(--ink-muted);
  border-color: var(--accent);
}
.pg-mute-btn[aria-pressed="true"] .pg-sound-body {
  opacity: 0.6;
}
.pg-mute-btn[aria-pressed="true"] .pg-sound-wave {
  display: none;
}
.pg-mute-btn[aria-pressed="true"] .pg-sound-slash {
  display: block;
  color: var(--accent);
}
.pg-canvas-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem;
  background: #0B0C0E;
}
.pg-canvas {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  background: transparent;
  outline: none;
  cursor: crosshair;
}
.pg-canvas:focus-visible {
  box-shadow: 0 0 0 2px var(--accent);
  border-radius: 4px;
}
.pg-canvas-wrap .pg-status {
  position: static;
  pointer-events: auto;
  opacity: 0.9;
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

/* Search Modal */
body.search-open {
  overflow: hidden;
}
.search-modal[hidden] {
  display: none;
}
.search-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: min(10vh, 84px) 16px 24px;
}
.search-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(11, 12, 14, 0.56);
  backdrop-filter: blur(3px);
}
.search-dialog {
  position: relative;
  z-index: 1;
  width: min(680px, 100%);
  max-height: min(76vh, 640px);
  display: flex;
  flex-direction: column;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 0.95rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.search-input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-family: inherit;
  font-size: 0.98rem;
  outline: none;
}
.search-close {
  appearance: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-elevated);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  padding: 0.2rem 0.48rem;
  cursor: pointer;
}
.search-meta {
  padding: 0.4rem 0.95rem;
  font-size: 0.76rem;
  color: var(--ink-muted);
  border-bottom: 1px solid var(--border);
  background: var(--surface-elevated);
}
.search-results {
  overflow-y: auto;
  padding: 0.35rem;
}
.search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 0.58rem 0.72rem;
  border-radius: 7px;
  color: var(--ink);
  text-decoration: none;
}
.search-item:hover,
.search-item.active {
  background: var(--accent-soft);
  text-decoration: none;
}
.search-item-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.search-item-title {
  font-weight: 600;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-item-sub {
  font-size: 0.78rem;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-kind-badge {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.14rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
}
.search-empty {
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--ink-muted);
  font-size: 0.9rem;
}

/* Shared Portal, Prose & Cards */
.page-hero {
  padding: 2rem 0 1.4rem;
}
.page-hero h1 {
  margin: 0 0 0.5rem;
  font-size: clamp(1.7rem, 3vw, 2.3rem);
  letter-spacing: -0.02em;
}
.portal-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.15rem;
}
.portal-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.15rem;
}
@media (max-width: 900px) {
  .portal-grid,
  .portal-grid-2 {
    grid-template-columns: 1fr;
  }
}
.portal-card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 1.15rem 1.25rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.portal-card h2,
.portal-card h3 {
  margin: 0;
  font-size: 1.06rem;
}
.portal-card p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink-muted);
}
.portal-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.portal-card-foot {
  margin-top: auto;
  padding-top: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.14rem 0.52rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
  font-size: 0.72rem;
  font-weight: 600;
}
.status-pill-shipped,
.status-pill-universal,
.status-pill-solved {
  border-color: rgba(44, 110, 49, 0.45);
  background: rgba(44, 110, 49, 0.12);
  color: var(--tok-string);
}
.status-pill-selected,
.status-pill-play {
  border-color: rgba(13, 102, 120, 0.45);
  background: rgba(13, 102, 120, 0.12);
  color: var(--tok-type);
}
.status-pill-proposal,
.status-pill-cli {
  border-color: rgba(201, 123, 20, 0.45);
  background: var(--accent-soft);
  color: var(--accent);
}
.status-pill-historical,
.status-pill-open {
  border-color: var(--border);
  background: var(--surface);
  color: var(--ink-muted);
}
.portal-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 220px;
  gap: 1.75rem;
  padding: 1.5rem 0 2.5rem;
  align-items: start;
}
.portal-layout-2col {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  gap: 1.75rem;
  padding: 1.5rem 0 2.5rem;
  align-items: start;
}
@media (max-width: 1120px) {
  .portal-layout {
    grid-template-columns: 240px minmax(0, 1fr);
  }
  .portal-toc {
    display: none;
  }
}
@media (max-width: 820px) {
  .portal-layout,
  .portal-layout-2col {
    grid-template-columns: 1fr;
  }
}
.portal-sidebar,
.portal-toc {
  position: sticky;
  top: 76px;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
  padding: 0.9rem 1rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.85rem;
}
.portal-sidebar-title,
.portal-toc-title {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-muted);
  margin: 0 0 0.55rem;
}
.portal-nav-group {
  margin-bottom: 0.9rem;
}
.portal-nav-group summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.35rem;
}
.portal-nav-list {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.portal-nav-list a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.24rem 0.45rem;
  border-radius: 6px;
  color: var(--ink-muted);
}
.portal-nav-list a:hover {
  background: var(--surface);
  color: var(--ink);
  text-decoration: none;
}
.portal-nav-list a.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.portal-toc ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}
.portal-toc li.toc-l3 {
  padding-left: 0.75rem;
  font-size: 0.8rem;
}
.portal-toc a {
  color: var(--ink-muted);
}
.portal-toc a:hover {
  color: var(--accent);
  text-decoration: none;
}
.md-prose {
  min-width: 0;
}
.md-prose h1 { font-size: clamp(1.6rem, 2.8vw, 2.15rem); margin: 0 0 0.85rem; line-height: 1.2; }
.md-prose h2 { font-size: 1.35rem; margin: 1.9rem 0 0.7rem; padding-top: 0.5rem; border-top: 1px solid var(--border); scroll-margin-top: 76px; }
.md-prose h3 { font-size: 1.1rem; margin: 1.35rem 0 0.5rem; scroll-margin-top: 76px; }
.md-prose h4, .md-prose h5, .md-prose h6 { font-size: 0.98rem; margin: 1rem 0 0.4rem; scroll-margin-top: 76px; }
.md-prose p { margin: 0 0 0.95rem; }
.md-prose ul, .md-prose ol { margin: 0 0 1rem; padding-left: 1.45rem; }
.md-prose li { margin-bottom: 0.35rem; }
.md-prose code {
  font-family: var(--font-mono);
  font-size: 0.86em;
  padding: 0.08rem 0.34rem;
  border-radius: 5px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.md-prose pre {
  margin: 0 0 1rem;
  padding: 0.9rem 1rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.5;
  overflow-x: auto;
}
.md-prose pre code {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: inherit;
}
.md-prose blockquote {
  margin: 0 0 1rem;
  padding: 0.65rem 1rem;
  border-left: 3px solid var(--accent);
  background: var(--surface);
  border-radius: 0 var(--radius) var(--radius) 0;
  color: var(--ink-muted);
}
.md-prose blockquote p:last-child { margin-bottom: 0; }
.md-alert {
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  background: var(--surface);
}
.md-alert-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.3rem;
  color: var(--accent);
}
.md-alert p:last-child { margin-bottom: 0; }
.md-table-wrap {
  width: 100%;
  overflow-x: auto;
  margin: 0 0 1.1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.md-table-wrap table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.md-table-wrap th,
.md-table-wrap td {
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}
.md-table-wrap thead th {
  background: var(--surface);
  font-weight: 600;
}
.md-table-wrap tbody tr:last-child td {
  border-bottom: 0;
}
.filter-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 1rem;
}
.filter-pill {
  appearance: none;
  padding: 0.3rem 0.72rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.filter-pill:hover {
  border-color: var(--accent);
  color: var(--ink);
}
.filter-pill[aria-pressed="true"] {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.filter-input {
  font-family: inherit;
  font-size: 0.86rem;
  padding: 0.38rem 0.7rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink);
  min-width: 220px;
}

/* Modules & Tools */
.module-symbol-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.module-symbol-card,
.tools-cmd-card {
  scroll-margin-top: 76px;
}
.module-sym-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.module-sym-anchor {
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-weight: 700;
  text-decoration: none;
}
.module-sym-anchor:hover {
  color: var(--accent);
}
.module-sym-doc {
  margin: 0.25rem 0 0;
  color: var(--ink-muted);
  font-size: 0.92rem;
}
.module-sym-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}
.module-sym-preview code {
  font-size: 0.78rem;
}

/* Docs Portal */
.docs-layer-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.65rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.82rem;
  font-weight: 600;
}
.docs-verified-toggle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.75rem;
  font-size: 0.82rem;
  color: var(--ink-muted);
  cursor: pointer;
}
.docs-badge-row {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.md-snippet-card {
  margin: 0 0 1.1rem;
}
.md-snippet-card pre.code-block {
  margin: 0;
  border: 0;
  border-radius: 0;
}
.docs-page-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.docs-source-row {
  font-size: 0.85rem;
  color: var(--ink-muted);
}
.docs-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Learn Curriculum & Live Lesson Runner */
.learn-main {
  width: min(1620px, 100% - 32px);
  margin-inline: auto;
  padding: 1.25rem 0 2.5rem;
}
.learn-progress-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 1.2rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.learn-progress-stats {
  flex: 1 1 260px;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.learn-bar-track {
  height: 8px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  overflow: hidden;
}
.learn-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width 0.2s ease;
}
.learn-done-label {
  color: var(--tok-string);
  font-weight: 600;
}
.learn-workbench {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) minmax(390px, 46%);
  gap: 1.35rem;
  align-items: start;
}
@media (max-width: 1180px) {
  .learn-workbench {
    grid-template-columns: minmax(0, 1fr) minmax(340px, 48%);
  }
  .learn-sidebar {
    display: none;
  }
}
@media (max-width: 860px) {
  .learn-workbench {
    grid-template-columns: 1fr;
  }
}
.learn-runner {
  position: sticky;
  top: 76px;
  max-height: calc(100vh - 94px);
}
@media (max-width: 860px) {
  .learn-runner {
    position: static;
    max-height: none;
  }
}
.learn-runner .pg-panel {
  min-height: 190px;
  max-height: 290px;
}
.learn-complete-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1.35rem 0 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}
.learn-done-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: transparent;
  flex-shrink: 0;
}
a.is-completed .learn-done-dot {
  background: var(--tok-string);
}

/* Lite Gym Coding Dojo & Multi-Case Judge */
.gym-progress-headline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.gym-belt-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(110px, 1fr));
  gap: 0.65rem;
  margin-top: 0.35rem;
}
@media (max-width: 680px) {
  .gym-belt-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.gym-belt-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.85rem;
}
.belt-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.16rem 0.55rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  border: 1px solid var(--border);
}
.belt-white {
  background: var(--surface-elevated);
  color: var(--ink);
}
.belt-amber {
  background: var(--accent-soft);
  color: var(--tok-keyword);
  border-color: var(--accent);
}
.belt-emerald {
  background: rgba(44, 110, 49, 0.14);
  color: var(--tok-string);
  border-color: var(--tok-string);
}
.belt-obsidian {
  background: rgba(122, 62, 157, 0.16);
  color: var(--tok-number);
  border-color: var(--tok-number);
}
.gym-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  padding: 0.85rem 1rem;
  margin-bottom: 1.5rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.gym-filter-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.gym-filter-btn {
  appearance: none;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.34rem 0.72rem;
  border-radius: 7px;
  cursor: pointer;
}
.gym-filter-btn:hover {
  color: var(--ink);
  border-color: var(--accent);
}
.gym-filter-btn[aria-pressed="true"] {
  background: var(--accent-soft);
  color: var(--ink);
  border-color: var(--accent);
}
.gym-card-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  font-size: 0.8rem;
}
.gym-solved-label,
.gym-solved-pill {
  color: var(--tok-string);
  border-color: var(--tok-string);
  font-weight: 700;
}
.gym-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-bottom: 1.15rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--border);
}
.gym-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  font-size: 0.88rem;
  color: var(--ink-muted);
}
.gym-dojo {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 50%);
  gap: 1.5rem;
  align-items: start;
}
@media (max-width: 960px) {
  .gym-dojo {
    grid-template-columns: 1fr;
  }
}
.gym-prompt-col {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  min-width: 0;
}
.gym-cases {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.gym-case-spec,
.gym-hints,
.gym-solution-panel,
.gym-related {
  padding: 0.9rem 1rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.gym-case-spec-head,
.gym-hints-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.gym-hints-head h2,
.gym-related h2,
.gym-cases-section h2 {
  font-size: 1.05rem;
  margin: 0;
}
.gym-io-pair,
.gym-diff {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.55rem;
}
@media (max-width: 640px) {
  .gym-io-pair,
  .gym-diff {
    grid-template-columns: 1fr;
  }
}
.gym-io-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-muted);
  margin-bottom: 0.25rem;
}
.gym-io-pre,
.gym-diff-pre,
.gym-diag-pre {
  margin: 0;
  padding: 0.5rem 0.65rem;
  border-radius: 6px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.45;
  overflow-x: auto;
  white-space: pre-wrap;
}
.gym-hints-list {
  margin: 0.7rem 0 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.gym-solution-panel pre {
  margin-top: 0.75rem;
  margin-bottom: 0;
}
.gym-related ul {
  margin: 0.65rem 0 0;
  padding-left: 1.2rem;
}
.gym-results-panel {
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.gym-result-empty {
  color: var(--ink-muted);
  font-size: 0.9rem;
}
.gym-judge-banner {
  padding: 0.55rem 0.8rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  border: 1px solid var(--border);
}
.gym-judge-pass {
  background: rgba(44, 110, 49, 0.14);
  color: var(--tok-string);
  border-color: var(--tok-string);
}
.gym-judge-fail {
  background: rgba(201, 123, 20, 0.14);
  color: var(--tok-keyword);
  border-color: var(--tok-keyword);
}
.gym-result-cards {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.gym-case-card {
  padding: 0.65rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
}
.gym-case-pass {
  border-left: 3px solid var(--tok-string);
}
.gym-case-fail {
  border-left: 3px solid var(--tok-keyword);
}
.gym-case-meta {
  font-size: 0.8rem;
  color: var(--ink-muted);
  margin-top: 0.3rem;
}
`;
