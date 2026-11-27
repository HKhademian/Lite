/** Stylesheet for the static Lite public showcase site and playground, emitted to dist/site/style.css. */

export const siteCss = `:root {
  color-scheme: light dark;
  --bg: #F5F3EE;
  --surface: #ECE8DF;
  --surface-elevated: #FBFAF7;
  --border: #DDD7CB;
  --border-strong: #C8C0B0;
  --ink: #101113;
  --ink-muted: #56585E;
  --accent: #C97B14;
  --accent-soft: rgba(201, 123, 20, 0.12);
  --ok: #2C6E31;
  --ok-soft: rgba(44, 110, 49, 0.12);
  --err: #B83227;
  --err-soft: rgba(184, 50, 39, 0.12);
  --info: #0D6678;
  --info-soft: rgba(13, 102, 120, 0.12);
  --header-bg: rgba(245, 243, 238, 0.88);
  --shadow-sm: 0 2px 8px rgba(16, 17, 19, 0.05);
  --shadow-md: 0 14px 36px rgba(16, 17, 19, 0.12);
  --code-bg: #FBFAF7;
  --tok-keyword: #9E4B08;
  --tok-type: #0D6678;
  --tok-string: #2C6E31;
  --tok-number: #7A3E9D;
  --tok-comment: #6E7178;
  --tok-op: #8B4513;
  --radius: 16px;
  --font-sans: ui-sans-serif, system-ui, sans-serif;
  --on-accent: #0B0C0E;
  --font-mono: 'SF Mono', ui-monospace, monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0B0C0E;
    --surface: #1A1D22;
    --surface-elevated: #131519;
    --border: #252930;
    --border-strong: #373D47;
    --ink: #F2F0EA;
    --ink-muted: #9EA2AC;
    --accent: #F0B45A;
    --accent-soft: rgba(240, 180, 90, 0.14);
    --ok: #89C983;
    --ok-soft: rgba(137, 201, 131, 0.14);
    --err: #F28B82;
    --err-soft: rgba(242, 139, 130, 0.14);
    --info: #6EC4D8;
    --info-soft: rgba(110, 196, 216, 0.14);
    --header-bg: rgba(11, 12, 14, 0.86);
    --shadow-sm: 0 2px 10px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 18px 46px rgba(0, 0, 0, 0.52);
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
  --border-strong: #373D47;
  --ink: #F2F0EA;
  --ink-muted: #9EA2AC;
  --accent: #F0B45A;
  --accent-soft: rgba(240, 180, 90, 0.14);
  --ok: #89C983;
  --ok-soft: rgba(137, 201, 131, 0.14);
  --err: #F28B82;
  --err-soft: rgba(242, 139, 130, 0.14);
  --info: #6EC4D8;
  --info-soft: rgba(110, 196, 216, 0.14);
  --header-bg: rgba(11, 12, 14, 0.86);
  --shadow-sm: 0 2px 10px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 18px 46px rgba(0, 0, 0, 0.52);
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
  --switch-shine-spread: 0px;
  --switch-shine-icon-glow: 2px;
  --switch-color: #D9B991;
  --switch-shine-core: rgba(254, 240, 138, 0.72);
  --switch-shine-mid: rgba(251, 191, 36, 0.5);
  --switch-shine-outer: rgba(147, 197, 253, 0.45);
  --switch-shadow: 0 0 7px rgba(217, 185, 145, 0.24);
  --switch-shadow-hover: 0 0 10px rgba(217, 185, 145, 0.4);
  --switch-glow: drop-shadow(0 0 var(--switch-shine-icon-glow) rgba(217, 185, 145, 0.35));
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
}
.theme-toggle.theme-toggle-shine:active {
  transform: translateY(0) scale(0.92);
  animation: none;
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
  background: var(--header-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 20;
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

.mobile-nav-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink);
  cursor: pointer;
}
.site-nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  font-weight: 500;
  flex-wrap: wrap;
}
.site-nav a {
  color: var(--ink-muted);
  white-space: nowrap;
  padding: 0.24rem 0.46rem;
  border-radius: 6px;
  transition: color 0.15s ease, background-color 0.15s ease;
}
.site-nav a:hover { color: var(--ink); background: var(--surface); text-decoration: none; }
.site-nav a.active { color: var(--accent); background: var(--accent-soft); font-weight: 600; text-decoration: none; }
.nav-academy-group {
  display: inline-flex;
  align-items: center;
  gap: 0.18rem;
  padding: 0.18rem;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--surface);
}
.nav-academy-group a {
  padding: 0.2rem 0.52rem;
  border-radius: 7px;
  font-size: 0.87rem;
}
.nav-academy-group a:hover {
  background: var(--surface-elevated);
}
.nav-academy-group a.active {
  background: var(--surface-elevated);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}
.search-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.24rem 0.55rem;
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
    padding: 0.5rem 0;
    gap: 0.5rem 0.75rem;
  }
  .mobile-nav-toggle {
    display: inline-flex;
    margin-left: auto;
  }
  .site-nav {
    display: none;
    width: 100%;
    padding: 0.65rem 0 0.35rem;
    border-top: 1px solid var(--border);
    gap: 0.45rem 0.65rem;
    font-size: 0.88rem;
  }
  .site-nav.is-open {
    display: flex;
  }
  .nav-academy-group {
    flex-wrap: wrap;
  }
}
@media (max-width: 640px) {
  .header-inner {
    flex-wrap: wrap;
    padding: 0.5rem 0;
    gap: 0.5rem 0.75rem;
  }
  .site-nav {
    flex-wrap: wrap;
    gap: 0.45rem 0.65rem;
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
  .hero { grid-template-columns: minmax(0, 1fr); padding: 2rem 0 1.5rem; }
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
  padding: 0.55rem 1rem;
  border-radius: 999px;
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
  color: var(--on-accent);
}
.btn-primary:hover { filter: brightness(1.06); }

.quickstart {
  --shell-bg: var(--code-bg);
  --shell-head: var(--surface);
  --shell-border: var(--border);
  --shell-ink: var(--ink);
  --shell-muted: var(--ink-muted);
  --shell-prompt: var(--accent);
  --shell-cmd: var(--info);
  background: var(--shell-bg);
  border: 1px solid var(--shell-border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.quickstart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.85rem;
  background: var(--shell-head);
  border-bottom: 1px solid var(--shell-border);
}
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
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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
.pg-opt-select {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.34rem 0.45rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink);
  cursor: pointer;
}
.pg-opt-select:hover {
  border-color: var(--accent);
}
.pg-opt-select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.pg-editor-wrap {
  position: relative;
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 220px;
  background: var(--code-bg);
  overflow: hidden;
}
.pg-editor-gutter {
  flex: 0 0 46px;
  width: 46px;
  padding: 16px 0;
  border-right: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 0.86rem;
  line-height: 1.55;
  text-align: right;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  font-variant-numeric: tabular-nums;
}
.ed-ln {
  display: block;
  padding: 0 9px 0 6px;
}
.ed-ln.is-active {
  color: var(--ink);
  font-weight: 600;
  background: var(--accent-soft);
}
.ed-ln.is-error {
  color: var(--err);
  font-weight: 700;
  background: var(--err-soft);
}
.pg-editor-body {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}
.ed-cursor-meta {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  color: var(--ink-muted);
  margin-left: auto;
  white-space: nowrap;
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
  z-index: 1;
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
.pg-tab:disabled,
.pg-tab[aria-disabled="true"] {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: auto;
}
.pg-tab:disabled:hover {
  color: var(--ink-muted);
}
.pg-tab[hidden] { display: none; }
.pg-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15rem;
  height: 1.15rem;
  margin-left: 0.35rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
}
.pg-tab-badge[hidden] { display: none; }

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
.pg-eof-btn {
  color: var(--accent);
  border-color: var(--accent);
}
.pg-kill-btn {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.55);
}
.pg-kill-btn:hover {
  color: #fca5a5;
  border-color: #f87171;
}
.pg-gen-toolbar {
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 0.55rem 1.25rem;
}
.pg-gen-group {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.pg-gen-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-muted);
}
.pg-seg-group {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 7px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  gap: 2px;
}
.pg-seg-group .code-lang-btn,
.pg-seg-group .code-mode-btn {
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-muted);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.2rem 0.62rem;
  border-radius: 5px;
  cursor: pointer;
  line-height: 1.25;
}
.pg-seg-group .code-lang-btn {
  font-family: var(--font-mono);
}
.pg-seg-group .code-lang-btn:hover,
.pg-seg-group .code-mode-btn:hover {
  color: var(--ink);
}
.pg-seg-group .code-lang-btn[aria-pressed="true"],
.pg-seg-group .code-mode-btn[aria-pressed="true"] {
  color: var(--accent);
  background: var(--surface-elevated);
  border-color: var(--border);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
}
.pg-twin-btn {
  display: inline-flex;
  align-items: stretch;
}
.pg-twin-btn > .btn:first-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}
.pg-twin-btn > .btn:last-child {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.pg-gen-code {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
}
.pg-console-panel {
  background: #0b0c0e;
  overflow: hidden;
}
.pg-console {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0.85rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.84rem;
  line-height: 1.55;
  color: #e6e7ea;
  background: #0b0c0e;
  cursor: text;
  outline: none;
}
.pg-console-log {
  white-space: pre-wrap;
  word-break: break-word;
}
.pg-console-cmd {
  color: #f4f4f6;
  font-weight: 600;
  margin-top: 0.45rem;
}
.pg-console-cmd:first-child {
  margin-top: 0;
}
.pg-console-cmd-sigil {
  color: #f59e0b;
  margin-right: 0.45rem;
  user-select: none;
}
.pg-console-stdout {
  color: #e6e7ea;
  white-space: pre-wrap;
}
.pg-console-stderr {
  color: #f87171;
  white-space: pre-wrap;
}
.pg-console-sys {
  color: #9ca3af;
  font-size: 0.78rem;
}
.pg-console-stdin-echo {
  color: #93c5fd;
}
.pg-console-exit {
  display: inline-block;
  margin: 0.1rem 0 0.35rem;
  font-size: 0.74rem;
  color: #6b7280;
}
.pg-console-exit-ok {
  color: #6b7280;
}
.pg-console-exit-err {
  color: #f87171;
}
.pg-console-input-row {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  margin-top: 0.25rem;
}
.pg-console-input-row.is-waiting {
  margin-top: 0.1rem;
}
.pg-console-prompt {
  color: #f59e0b;
  font-weight: 700;
  user-select: none;
  flex: 0 0 auto;
}
.pg-console-input-row.is-waiting .pg-console-prompt {
  color: #60a5fa;
}
.pg-console-field {
  position: relative;
  flex: 1 1 auto;
  min-width: 60px;
}
.pg-console-ghost {
  position: absolute;
  inset: 0;
  color: rgba(230, 231, 234, 0.32);
  pointer-events: none;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pg-console-input {
  position: relative;
  width: 100%;
  border: none;
  background: transparent;
  color: #f8fafc;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  padding: 0;
  margin: 0;
  outline: none;
  caret-color: #f59e0b;
}
.pg-console-input-row.is-waiting .pg-console-input {
  color: #93c5fd;
  caret-color: #60a5fa;
}
.pg-console-hint {
  flex: 0 0 auto;
  font-size: 0.72rem;
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
  white-space: nowrap;
}
.pg-console-hint[hidden] { display: none; }
.pg-output-cards {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.9rem 1rem;
}
.pg-out-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-elevated);
  overflow: hidden;
}
.pg-out-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.48rem 0.75rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink);
}
.pg-out-meta {
  font-family: var(--font-mono);
  font-size: 0.73rem;
  font-weight: 500;
  color: var(--ink-muted);
}
.pg-out-body {
  padding: 0.65rem 0.75rem;
}
.pg-out-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.55rem 0.85rem;
}
.pg-out-kv {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}
.pg-out-k {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-muted);
}
.pg-out-v {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--ink);
}
.pg-out-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.pg-out-diag {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  width: 100%;
  text-align: left;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
  padding: 0.42rem 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  cursor: pointer;
}
.pg-out-diag:hover {
  border-color: var(--accent);
}
.pg-out-diag-loc {
  color: var(--accent);
  font-weight: 600;
  flex: 0 0 auto;
}
.pg-out-diag-cat {
  color: #f87171;
  font-weight: 600;
  flex: 0 0 auto;
}
.pg-out-tone-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--border);
}
.pg-out-tone-row:last-child {
  border-bottom: none;
}
.pg-out-file {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  overflow: hidden;
}
.pg-out-file-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.78rem;
}
.pg-out-file-pre {
  margin: 0;
  padding: 0.5rem 0.65rem;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  max-height: 200px;
  overflow: auto;
  background: var(--code-bg);
  color: var(--ink);
}
.pg-out-empty {
  color: var(--ink-muted);
  font-size: 0.82rem;
  padding: 0.3rem 0;
}
.pg-out-svg-wrap {
  padding: 0.65rem;
  background: #0b0c0e;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: center;
  align-items: center;
}
.pg-out-svg-preview {
  max-width: 100%;
  max-height: 220px;
  display: block;
}
.pg-opts-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.pg-opts-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent);
  display: inline-block;
}
.pg-opts-dot[hidden] { display: none; }
.pg-opts-modal {
  max-width: 660px;
}
.pg-opts-body {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 0.95rem 1.1rem 1.1rem;
  overflow: auto;
}
.pg-opts-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.pg-opts-section-title {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-muted);
}
.pg-opts-section-title code {
  text-transform: none;
  letter-spacing: 0;
}
.pg-opts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.65rem;
}
.pg-opts-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.pg-opts-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ink-muted);
}
.pg-opts-passes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.45rem 0.65rem;
}
.pg-opts-pass {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.32rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  color: var(--ink);
  white-space: nowrap;
}
.pg-opts-pass select {
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface-elevated);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 0.74rem;
  padding: 0.14rem 0.35rem;
}
.pg-opts-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 0.55rem;
  border-top: 1px solid var(--border);
}
.pg-opts-cli-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  flex: 1 1 220px;
}
#pg-opts-cli-preview {
  display: block;
  padding: 0.3rem 0.5rem;
  border-radius: 5px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  color: var(--ink);
  overflow-x: auto;
  white-space: nowrap;
}
.pg-canvas-wrap.is-fullscreen,
.pg-canvas-wrap.is-theater {
  position: fixed;
  inset: 12px;
  z-index: 90;
  border-radius: var(--radius);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-md);
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
.pg-canvas-wrap[hidden] { display: none; }
.pg-canvas-empty {
  flex: 1 1 auto;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: #0b0c0e;
  color: #e6e7ea;
}
.pg-canvas-empty[hidden] { display: none; }
.pg-canvas-empty-frame {
  padding: 1rem 1.4rem;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}
.pg-canvas-empty-title {
  font-size: 0.86rem;
  font-weight: 600;
  color: #9ca3af;
}
.pg-canvas-empty-sub {
  font-size: 0.76rem;
  color: #6b7280;
}
.pg-canvas-empty-sub code {
  color: #9ca3af;
  font-family: var(--font-mono);
}
.pg-share-modal {
  max-width: 560px;
}
.pg-share-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.95rem 1.1rem 1.1rem;
}
.pg-share-url {
  width: 100%;
  resize: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--code-bg);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  line-height: 1.45;
  padding: 0.55rem 0.65rem;
  word-break: break-all;
}
.pg-share-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.snips-tag-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
  padding: 0 1.1rem 0.6rem;
}
.snips-tag-chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 0.16rem 0.48rem;
  border-radius: 999px;
  cursor: pointer;
}
.snips-tag-chip:hover {
  color: var(--ink);
  border-color: var(--border-strong);
}
.snips-tag-chip[aria-pressed="true"] {
  color: var(--accent);
  border-color: var(--accent);
  background: rgba(245, 158, 11, 0.1);
}
.snips-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.15rem;
}
.snips-item-tag {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  padding: 0.06rem 0.38rem;
  border-radius: 4px;
  cursor: pointer;
}
.snips-item-tag:hover {
  color: var(--accent);
  border-color: var(--accent);
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
.pg-mute-btn,
.pg-stage-icon-btn {
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
.pg-mute-btn svg,
.pg-stage-icon-btn svg {
  display: block;
  width: 14px;
  height: 14px;
}
.pg-stage-icon-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.pg-stage-icon-btn[aria-pressed="true"] {
  color: var(--accent);
  border-color: var(--accent);
}
.pg-stage-icon-btn .pg-icon-exit {
  display: none;
}
.pg-stage-icon-btn[aria-pressed="true"] .pg-icon-enter {
  display: none;
}
.pg-stage-icon-btn[aria-pressed="true"] .pg-icon-exit {
  display: block;
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
.search-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.48rem 0.95rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-elevated);
}
.search-cat-btn {
  appearance: none;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  cursor: pointer;
}
.search-cat-btn:hover {
  color: var(--ink);
  border-color: var(--accent);
}
.search-cat-btn[aria-pressed="true"] {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.search-foot {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.42rem 0.95rem;
  border-top: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.74rem;
  color: var(--ink-muted);
}
.search-foot kbd {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  padding: 0.04rem 0.3rem;
  border-radius: 4px;
  border: 1px solid var(--border);
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

/* Documentation navigation and entry points */

.docs-destinations {
  background: var(--surface-elevated);
  border-bottom: 1px solid var(--border);
}
.docs-destinations .container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem 0.4rem;
  padding-block: 0.35rem;
}
.docs-destinations a {
  display: inline-block;
  padding: 0.38rem 0.68rem;
  border-radius: 999px;
  font-size: 0.88rem;
}
.docs-destinations a:hover {
  background: var(--accent-soft);
}
.page-hero.docs-welcome {
  margin-block: 1.6rem;
  padding: clamp(1.25rem, 4vw, 3rem);
  border-radius: calc(var(--radius) + 8px);
  border: 1px solid var(--border);
  background: var(--surface-elevated);
}
.docs-welcome .hero-actions {
  margin-bottom: 0;
}
.docs-paths .portal-card {
  padding: 1.3rem;
}
.reference-topics {
  align-items: start;
  margin-bottom: 2.5rem;
}
.reference-chapter ul {
  margin: 0;
  padding-left: 1.2rem;
}
.reference-chapter li + li {
  margin-top: 0.3rem;
}
.sample-starters {
  margin: 1.5rem 0;
  scroll-margin-top: 76px;
}
.sample-path {
  margin-block: 1rem;
  padding: 0;
  list-style: none;
}
.sample-command {
  max-width: 100%;
  margin: 0.3rem 0;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  overflow-x: auto;
  background: var(--surface);
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
  display: block;
  padding: 0.12rem 0;
  transition: color 0.15s ease;
}
.portal-toc a:hover,
.portal-toc a.is-active {
  color: var(--accent);
  text-decoration: none;
}
.portal-toc a.is-active {
  font-weight: 600;
  border-left: 2px solid var(--accent);
  padding-left: 0.5rem;
  margin-left: -0.5rem;
}
.portal-toc code {
  font-family: var(--font-mono);
  font-size: 0.82em;
  padding: 0.04rem 0.25rem;
  border-radius: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.md-prose,
.doc-prose {
  min-width: 0;
}
.md-prose h1,
.doc-prose h1 { font-size: clamp(1.6rem, 2.8vw, 2.15rem); margin: 0 0 0.85rem; line-height: 1.2; letter-spacing: -0.015em; }
.md-prose h2,
.doc-prose h2 { position: relative; font-size: 1.35rem; margin: 1.9rem 0 0.7rem; padding-top: 0.65rem; border-top: 1px solid var(--border); scroll-margin-top: 76px; }
.md-prose h3,
.doc-prose h3 { position: relative; font-size: 1.1rem; margin: 1.35rem 0 0.5rem; scroll-margin-top: 76px; }
.md-prose h4, .md-prose h5, .md-prose h6,
.doc-prose h4, .doc-prose h5, .doc-prose h6 { font-size: 0.98rem; margin: 1rem 0 0.4rem; scroll-margin-top: 76px; }
.md-heading-anchor {
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.86em;
  margin-right: 0.42rem;
  opacity: 0.35;
  text-decoration: none;
  transition: opacity 0.15s ease, color 0.15s ease;
}
h2:hover .md-heading-anchor,
h3:hover .md-heading-anchor,
.md-heading-anchor:focus-visible {
  opacity: 1;
  color: var(--accent);
  text-decoration: none;
}
.md-heading-anchor.is-copied {
  opacity: 1;
  color: var(--ok);
}
.md-prose p,
.doc-prose p { margin: 0 0 0.95rem; }
.md-prose ul, .md-prose ol,
.doc-prose ul, .doc-prose ol { margin: 0 0 1rem; padding-left: 1.45rem; }
.md-prose li,
.doc-prose li { margin-bottom: 0.35rem; }
.md-prose code,
.doc-prose code {
  font-family: var(--font-mono);
  font-size: 0.86em;
  padding: 0.08rem 0.34rem;
  border-radius: 5px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.md-prose pre,
.doc-prose pre {
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
.md-prose pre code,
.doc-prose pre code {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: inherit;
}
.md-prose blockquote,
.doc-prose blockquote {
  margin: 0 0 1rem;
  padding: 0.65rem 1rem;
  border-left: 3px solid var(--accent);
  background: var(--surface);
  border-radius: 0 var(--radius) var(--radius) 0;
  color: var(--ink-muted);
}
.md-prose blockquote p:last-child,
.doc-prose blockquote p:last-child { margin-bottom: 0; }
.md-alert {
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  background: var(--surface);
}
.md-alert-note { border-left-color: var(--info); }
.md-alert-note .md-alert-title { color: var(--info); }
.md-alert-tip { border-left-color: var(--ok); }
.md-alert-tip .md-alert-title { color: var(--ok); }
.md-alert-important { border-left-color: var(--accent); }
.md-alert-warning,
.md-alert-caution { border-left-color: var(--err); }
.md-alert-warning .md-alert-title,
.md-alert-caution .md-alert-title { color: var(--err); }
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
.learn-track-jumps {
  margin: 0.5rem 0 1.4rem;
}
.learn-track-jumps h2 {
  margin: 0 0 0.5rem;
  font-size: 1.12rem;
}
.learn-track-jumps ul {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: 0.35rem 1.75rem;
  padding-left: 1.25rem;
  margin: 0;
}
[data-learn-track],
#gym-browse,
#gym-workbench-editor,
#gym-switcher {
  scroll-margin-top: 76px;
}
.learn-index-card[hidden],
.gym-index-card[hidden] {
  display: none;
}
:where(.gym-shell, .gym-browser, .gym-progress, .gym-exercise-list, .learn-track-jumps) :focus-visible {
  outline: 2px solid var(--tok-keyword);
  outline-offset: 3px;
}
.gym-progress-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 1rem 0;
}
.gym-progress summary,
.gym-more-filters summary {
  cursor: pointer;
  color: var(--ink);
  width: fit-content;
  font-weight: 600;
  padding: 0.3rem 0;
}
.gym-browser {
  max-width: 48rem;
}
.gym-browser label {
  display: block;
  font-weight: 600;
}
.gym-browser input {
  width: 100%;
  margin: 0.4rem 0 0.75rem;
}
.gym-more-filters {
  margin-top: 0.55rem;
}
.gym-more-filters .gym-filter-group {
  margin-block: 0.55rem;
}
.gym-exercise-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 1px solid var(--border);
}
.gym-index-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.8rem;
  padding: 0.55rem 0.15rem;
  border-bottom: 1px solid var(--border);
}
.gym-exercise-link {
  flex: 1 1 12rem;
  padding-block: 0.3rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.gym-status-label {
  color: var(--ink-muted);
  font-size: 0.85rem;
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
.gym-editor-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-height: none;
}
@media (max-width: 960px) {
  .gym-dojo {
    grid-template-columns: 1fr;
  }
  .gym-editor-col {
    position: static;
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
  min-height: 7rem;
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

/* Shared LocalStorage Snippets & Inline Docs Runner */
pre.code-block:has(+ .lite-snip-bar) {
  margin-bottom: 0;
  border-radius: var(--radius) var(--radius) 0 0;
}
.lite-snip-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 1rem;
  padding: 0.35rem 0.65rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 var(--radius) var(--radius);
}
.lite-snip-bar > .lite-snip-run { margin-inline-end: auto; }
:is(.lite-snip-bar, .md-snippet-card):has(+ .lite-inline-out:not([hidden])) {
  margin-bottom: 0;
}
.lite-snip-bar:has(+ .lite-inline-out:not([hidden])) {
  border-radius: 0;
}
.md-snippet-card:has(+ .lite-inline-out:not([hidden])) {
  border-radius: var(--radius) var(--radius) 0 0;
}
.lite-snip-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-right: auto;
  flex-wrap: wrap;
}
.lite-snip-btn {
  display: inline-flex;
  align-items: center;
  appearance: none;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-muted);
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.2;
  min-block-size: 2.25rem;
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
}
.lite-snip-btn:hover {
  color: var(--ink);
  background: var(--surface-elevated);
  text-decoration: none;
}
.lite-snip-btn:focus-visible {
  outline: 2px solid var(--info);
  outline-offset: 2px;
}
.lite-snip-btn:active { border-color: var(--border-strong); }
.lite-snip-btn:is(:disabled, [aria-disabled="true"]) {
  opacity: 0.6;
  cursor: wait;
}
.lite-snip-btn.copied {
  color: var(--ok);
  border-color: var(--ok);
}
.lite-snip-btn.lite-snip-run {
  padding-inline: 0.75rem;
  background: var(--ink);
  color: var(--surface-elevated);
}
.lite-snip-btn.lite-snip-run:hover:not(:disabled, [aria-disabled="true"]) {
  background: var(--ink-muted);
}
.lite-snip-btn.lite-snip-play {
  color: var(--tok-keyword);
}
.lite-snip-btn.lite-snip-play:hover { background: var(--accent-soft); }
@media (max-width: 640px), (pointer: coarse) {
  .lite-snip-btn { min-block-size: 2.75rem; }
}
.lite-inline-out {
  margin: 0 0 1.1rem;
  border: 1px solid var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
  background: var(--surface-elevated);
  overflow: hidden;
}
.lite-inline-out[hidden] { display: none; }
.lite-inline-out-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.3rem 0.65rem 0 1rem;
  font-size: 0.8rem;
  color: var(--ink-muted);
}
.lite-inline-out-summary {
  display: flex;
  align-items: baseline;
  flex: 1;
  flex-wrap: wrap;
  gap: 0.15rem 0.55rem;
}
.lite-inline-out-summary strong { color: var(--ink); }
.lite-inline-out.is-err .lite-inline-out-summary strong { color: var(--err); }
.lite-inline-out-detail { font-variant-numeric: tabular-nums; }
.lite-inline-out-detail:empty { display: none; }
.lite-inline-out-head button[hidden] { display: none; }
.lite-inline-canvas {
  display: block;
  width: min(100%, 32rem);
  height: auto;
  margin: 0.75rem auto;
  image-rendering: pixelated;
}
.lite-inline-canvas:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
pre.lite-inline-out-pre {
  margin: 0;
  padding: 0.15rem 1rem 0.8rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.48;
  white-space: pre-wrap;
  overflow-x: auto;
}

/* Academy Hub, Cross-Links, Diff & Mobile Drawers */
.academy-resume-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.85rem 1.25rem;
  padding: 0.85rem 1.1rem;
  margin-bottom: 1.25rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}
.academy-resume-bar[hidden] { display: none; }
.academy-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.55rem 0.85rem;
  font-size: 0.86rem;
}
.academy-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.18rem 0.58rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.8rem;
}
.academy-pillar-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.05rem;
}
@media (max-width: 1024px) {
  .academy-pillar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  .academy-pillar-grid {
    grid-template-columns: 1fr;
  }
}
.academy-ref-strip {
  margin-top: 1.15rem;
  padding: 0.85rem 1.1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 0.9rem;
}
.academy-ref-links {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  font-weight: 600;
}
.docs-crosslinks {
  margin-top: 1.75rem;
  padding: 1rem 1.1rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.docs-crosslinks h2 {
  margin: 0 0 0.65rem !important;
  padding-top: 0 !important;
  border-top: 0 !important;
  font-size: 1.06rem !important;
}
.academy-crosslink-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
@media (max-width: 720px) {
  .academy-crosslink-grid {
    grid-template-columns: 1fr;
  }
}
.academy-crosslink-card {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
}
.academy-crosslink-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.academy-gym-badge.is-done,
.academy-lesson-badge.is-done {
  color: var(--ok);
  border-color: var(--ok);
  background: var(--ok-soft);
}
.docs-sidebar-filter {
  width: 100%;
  padding: 0.36rem 0.6rem;
  margin-bottom: 0.55rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--ink);
  font-family: inherit;
  font-size: 0.82rem;
}
.docs-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}
.docs-sidebar-head .docs-verified-toggle {
  margin-bottom: 0;
}
.portal-mobile-bar {
  display: none;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.portal-drawer-backdrop[hidden] { display: none; }
.portal-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(11, 12, 14, 0.5);
}
@media (max-width: 1180px) {
  .portal-mobile-bar {
    display: flex;
  }
  body.drawer-sidebar-open .portal-sidebar {
    display: block !important;
    position: fixed;
    top: 64px;
    left: 12px;
    bottom: 12px;
    width: min(310px, calc(100vw - 24px));
    max-height: none;
    z-index: 50;
    box-shadow: var(--shadow-md);
  }
  body.drawer-toc-open .portal-toc {
    display: block !important;
    position: fixed;
    top: 64px;
    right: 12px;
    bottom: 12px;
    width: min(290px, calc(100vw - 24px));
    max-height: none;
    z-index: 50;
    box-shadow: var(--shadow-md);
  }
}
@media (max-width: 820px) {
  .portal-layout .portal-sidebar,
  .portal-layout-2col .portal-sidebar {
    display: none;
  }
}
.learn-workbench.has-split {
  --ln-split: 50%;
  grid-template-columns: 240px minmax(0, calc(var(--ln-split) - 125px)) 10px minmax(340px, 1fr);
  gap: 0 0.75rem;
}
.learn-workbench.has-split.is-sidebar-collapsed {
  grid-template-columns: minmax(0, var(--ln-split)) 10px minmax(340px, 1fr);
}
.learn-workbench.is-sidebar-collapsed .learn-sidebar {
  display: none;
}
@media (max-width: 1180px) {
  .learn-workbench.has-split {
    grid-template-columns: minmax(0, calc(var(--ln-split) - 5px)) 10px minmax(320px, 1fr);
    gap: 0;
  }
}
@media (max-width: 860px) {
  .learn-workbench.has-split {
    grid-template-columns: 1fr;
    gap: 1.15rem;
  }
  .learn-workbench .pg-split {
    display: none;
  }
}
.gym-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.15rem;
  align-items: start;
}
.gym-shell.is-sidebar-open {
  grid-template-columns: 260px minmax(0, 1fr);
}
.gym-sidebar {
  display: none;
}
#gym-switcher-close {
  margin-bottom: 0.75rem;
}
.gym-workspace {
  min-width: 0;
}
.gym-shell.is-sidebar-open .gym-sidebar {
  display: block;
}
@media (max-width: 1180px) {
  .gym-shell.is-sidebar-open {
    grid-template-columns: minmax(0, 1fr);
  }
  .gym-shell.is-sidebar-open .gym-sidebar {
    position: static;
    max-height: min(56vh, 28rem);
    overflow: auto;
  }
}
.gym-dojo.has-split {
  --gym-split: 49%;
  grid-template-columns: minmax(0, calc(var(--gym-split) - 5px)) 10px minmax(380px, 1fr);
  gap: 0;
}
@media (max-width: 960px) {
  .gym-dojo.has-split {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
  }
  .gym-dojo .pg-split { display: none; }
}
@media (max-width: 640px) {
  .gym-shell .pane-head {
    flex-wrap: wrap;
  }
  .gym-shell .sample-picker {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .gym-shell .pg-actions {
    flex-wrap: wrap;
  }
}
.gym-diff-lines {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  font-family: var(--font-mono);
  font-size: 0.79rem;
  line-height: 1.45;
  padding: 0.45rem 0.55rem;
  border-radius: 6px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  overflow-x: auto;
  white-space: pre-wrap;
}
.gym-diff-line-add {
  background: var(--ok-soft);
  color: var(--ok);
  padding: 0.04rem 0.25rem;
  border-radius: 3px;
}
.gym-diff-line-del {
  background: var(--err-soft);
  color: var(--err);
  padding: 0.04rem 0.25rem;
  border-radius: 3px;
}
.gym-diff-line-ctx {
  color: var(--ink-muted);
  padding: 0.04rem 0.25rem;
}
.sample-foot .lite-snip-btn {
  margin-right: auto;
}
.snips-modal-backdrop[hidden] { display: none; }
.snips-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(11, 12, 14, 0.58);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 6vh 16px 24px;
}
.snips-modal {
  width: min(740px, 100%);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}
.snips-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.snips-modal-head h2 {
  margin: 0;
  font-size: 1rem;
}
.snips-modal-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--border);
}
.snips-modal-tools input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0.42rem 0.65rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--ink);
  font-family: inherit;
  font-size: 0.88rem;
}
.snips-list {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.snips-item {
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.snips-item.active {
  border-color: var(--accent);
}
.snips-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.snips-item-title {
  font-weight: 700;
  font-size: 0.95rem;
}
.snips-rename-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1 1 220px;
}
.snips-rename-input {
  flex: 1 1 auto;
  padding: 0.28rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--accent);
  background: var(--surface-elevated);
  color: var(--ink);
  font-family: inherit;
  font-size: 0.88rem;
}
.snips-item-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.76rem;
  color: var(--ink-muted);
}
.snips-preview {
  margin: 0;
  padding: 0.4rem 0.55rem;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.snips-item-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.pg-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.38rem 0.56rem;
}
.pg-icon-btn[hidden],
#pg-reset[hidden] { display: none; }
.pg-active-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}
.pg-save-btn {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
}
.snips-cat-tabs {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  padding: 0.55rem 1rem 0;
}
.snips-cat-tab {
  appearance: none;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.28rem 0.62rem;
  border-radius: 999px;
  cursor: pointer;
}
.snips-cat-tab:hover {
  color: var(--ink);
  border-color: var(--accent);
}
.snips-cat-tab[aria-pressed="true"] {
  background: var(--accent-soft);
  color: var(--ink);
  border-color: var(--accent);
}

/* Spacious Docs & Handbook Navigation (C3 + V Docs + Salam UX) */
.docs-page .container {
  width: min(1440px, 100% - 32px);
}
.docs-page .portal-layout {
  grid-template-columns: 300px minmax(0, 1fr) 232px;
  gap: 2.25rem;
  padding: 1.5rem 0 3rem;
}
.docs-page .portal-layout-2col {
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 2.25rem;
  padding: 1.5rem 0 3rem;
}
.docs-page .portal-layout > .md-prose {
  max-width: 780px;
  width: 100%;
  margin-inline: auto;
}
@media (min-width: 1181px) {
  .docs-page .portal-sidebar {
    top: 66px;
    max-height: calc(100vh - 78px);
    padding: 0.45rem 1.15rem 1.5rem 0.25rem;
    background: transparent;
    border: 0;
    border-right: 1px solid var(--border);
    border-radius: 0;
  }
  .docs-page .portal-toc {
    top: 66px;
    max-height: calc(100vh - 78px);
    padding: 0.45rem 0.25rem 1.5rem 1.15rem;
    background: transparent;
    border: 0;
    border-left: 1px solid var(--border);
    border-radius: 0;
  }
}
@media (max-width: 1220px) {
  .docs-page .portal-layout {
    grid-template-columns: 280px minmax(0, 1fr);
  }
  .docs-page .portal-toc {
    display: none;
  }
  .docs-page .portal-mobile-bar {
    display: flex;
  }
}
@media (max-width: 860px) {
  .docs-page .portal-layout,
  .docs-page .portal-layout-2col {
    grid-template-columns: 1fr;
  }
  .docs-page .portal-sidebar {
    display: none;
  }
}
@media (max-width: 1180px) {
  .docs-page body.drawer-sidebar-open .portal-sidebar,
  body.drawer-sidebar-open .docs-page .portal-sidebar {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.9rem 1rem;
  }
  .docs-page body.drawer-toc-open .portal-toc,
  body.drawer-toc-open .docs-page .portal-toc {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.9rem 1rem;
  }
}
.docs-layer-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.25rem;
  padding: 0.24rem;
  margin-bottom: 0.7rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
}
.docs-layer-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.34rem 0.55rem;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-muted);
  text-decoration: none;
}
.docs-layer-tab:hover {
  color: var(--ink);
  text-decoration: none;
}
.docs-layer-tab.active {
  background: var(--surface-elevated);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}
.docs-quick-search-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.36rem 0.62rem;
  margin-bottom: 0.65rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 0.79rem;
  cursor: pointer;
}
.docs-quick-search-btn:hover {
  color: var(--ink);
  border-color: var(--accent);
}
.docs-quick-search-btn kbd {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 0.08rem 0.35rem;
  border-radius: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--ink-muted);
}
.hb-progress-strip {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.8rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid var(--border);
}
.hb-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.hb-compact-btn {
  appearance: none;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.16rem 0.48rem;
  border-radius: 6px;
  cursor: pointer;
}
.hb-compact-btn:hover,
.hb-compact-btn[aria-pressed="true"] {
  color: var(--ink);
  border-color: var(--accent);
}
.hb-part-label {
  margin: 0.85rem 0 0.32rem;
  padding-left: 0.2rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-muted);
}
.hb-part-label:first-child {
  margin-top: 0.1rem;
}
.hb-tree {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.hb-chapter-item {
  display: flex;
  flex-direction: column;
  gap: 0.16rem;
}
.hb-chapter-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.34rem 0.48rem;
  border-radius: 7px;
  color: var(--ink);
  font-weight: 600;
  font-size: 0.83rem;
  line-height: 1.3;
  text-decoration: none;
}
.hb-chapter-link:hover {
  background: var(--surface);
  text-decoration: none;
}
.hb-chapter-link.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.hb-chapter-title {
  flex: 1 1 auto;
  min-width: 0;
}
.hb-num {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--ink-muted);
}
.hb-chapter-link.active .hb-num {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
}
.hb-subtopics {
  list-style: none;
  margin: 0.05rem 0 0.35rem 0.95rem;
  padding: 0.08rem 0 0.08rem 0.65rem;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.16rem;
}
.hb-tree.is-compact .hb-chapter-item:not(.is-active) .hb-subtopics {
  display: none;
}
.hb-subtopics a {
  display: block;
  padding: 0.16rem 0.42rem;
  border-radius: 5px;
  font-size: 0.78rem;
  line-height: 1.34;
  color: var(--ink-muted);
  text-decoration: none;
}
.hb-subtopics a:hover {
  color: var(--ink);
  background: var(--surface);
  text-decoration: none;
}
.hb-subtopics a.is-active {
  color: var(--accent);
  font-weight: 600;
  background: var(--accent-soft);
}
.hb-subtopics code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 0.02rem 0.24rem;
  border-radius: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.hb-filter-empty {
  padding: 0.6rem 0.4rem;
}
.hb-inline-link {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--accent);
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
}
.hb-inline-link:hover { text-decoration: underline; }
.hb-sidebar-foot {
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--border);
}
.hb-kicker-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.55rem 0.9rem;
  margin-bottom: 0.7rem;
}
.hb-breadcrumbs {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: var(--ink-muted);
}
.hb-breadcrumbs a {
  color: var(--ink-muted);
}
.hb-breadcrumbs a:hover {
  color: var(--accent);
}
.hb-kicker-chapter {
  color: var(--accent);
  font-weight: 600;
}
.hb-roadmap {
  margin: 0.95rem 0 1.45rem;
  padding: 0.85rem 1rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius);
}
.hb-roadmap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}
.hb-roadmap-title {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-muted);
}
.hb-roadmap-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.42rem 0.9rem;
}
@media (max-width: 640px) {
  .hb-roadmap-list {
    grid-template-columns: 1fr;
  }
}
.hb-roadmap-list a {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
  font-size: 0.84rem;
  font-weight: 500;
  color: var(--ink);
  text-decoration: none;
}
.hb-roadmap-list a:hover {
  background: var(--surface);
  color: var(--accent);
  text-decoration: none;
}
.hb-roadmap-num {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--accent-soft);
  color: var(--accent);
}
.docs-pager-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  align-items: stretch;
}
@media (max-width: 640px) {
  .docs-pager-cards {
    grid-template-columns: 1fr;
  }
}
.docs-pager-card {
  display: flex;
  flex-direction: column;
  gap: 0.24rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--ink);
  text-decoration: none;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.docs-pager-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
  text-decoration: none;
}
.docs-pager-next {
  text-align: right;
  align-items: flex-end;
}
.docs-pager-kicker {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent);
}
.docs-pager-summary {
  font-size: 0.8rem;
  color: var(--ink-muted);
  line-height: 1.4;
}
.portal-toc-foot {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
}
.portal-toc-foot a {
  color: var(--ink-muted);
}
.portal-toc-foot a:hover {
  color: var(--accent);
}
`;
