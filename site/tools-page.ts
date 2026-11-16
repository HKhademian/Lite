/** Generates `/tools/` toolchain hub covering the Lite CLI, VS Code extension, Play host, and bootstrap ladder. */
import { renderPage, type SourceRevision } from './chrome.ts';
import { escapeHtml } from './highlight.ts';
import type { SearchEntry } from './search.ts';

type CliCommandDoc = Readonly<{
  name: string;
  synopsis: string;
  summary: string;
  example: string;
  exitCodes: string;
}>;

const CLI_COMMANDS: readonly CliCommandDoc[] = [
  {
    name: 'run',
    synopsis: './bin/lite run [--builtin-mode SPEC] file.lts [-- arg ...]',
    summary: 'Compiles a Lite source file to a temporary TypeScript artifact and executes it immediately through the Node entry runner, forwarding arguments and stdin.',
    example: './bin/lite run language/examples/foundations/io/double-sum.lts',
    exitCodes: 'Exit 0 on success; non-zero on compile/runtime fault or explicit io.exit(code).',
  },
  {
    name: 'compile',
    synopsis: './bin/lite compile [--target ts] [--builtin-mode SPEC] file.lts',
    summary: 'Emits generated TypeScript to stdout cleanly without running the program. Direct compiler wrappers `./bin/lite-compile-ts` and `./bin/lite-compile-c` target TS or C directly.',
    example: './bin/lite compile language/examples/foundations/io/double-sum.lts > out.ts',
    exitCodes: 'Exit 0 with generated source on stdout; exit 1 or 2 on diagnostics.',
  },
  {
    name: 'check',
    synopsis: './bin/lite check [--builtin-mode SPEC] file.lts',
    summary: 'Parses, typechecks, and validates execution-trace safety on a Lite file without executing it.',
    example: './bin/lite check language/showcases/blocks/trace/execution-trace-safety.lts',
    exitCodes: 'Exit 0 when checks pass; non-zero with line/column diagnostics.',
  },
  {
    name: 'fmt',
    synopsis: './bin/lite fmt [--check] [FILE_OR_DIR... | -]',
    summary: 'Formats Lite files idempotently with canonical indentation and brace spacing. Passes malformed files unchanged; `--check` verifies formatting without writing.',
    example: './bin/lite fmt --check language/examples lib/core tools/src',
    exitCodes: 'Exit 0 if formatted/clean; exit 1 under `--check` when changes are needed; exit 2 on invalid args.',
  },
  {
    name: 'test',
    synopsis: './bin/lite test [--smoke|--fast|--full] | --cases [FILTER]',
    summary: 'Runs repository verification suites (quiet smoke suite by default, `--fast`, `--full` release-grade sweep, or `--cases` declarative fixture runner).',
    example: './bin/lite test --cases tooling.quality.docs-search',
    exitCodes: 'Exit 0 when all selected tests and cases pass.',
  },
  {
    name: 'verify',
    synopsis: './bin/lite verify [--all|--update|--coverage|FILE.case.json]',
    summary: 'Verifies TS compilation, strict typechecking, and runtime outputs across declarative `.case.json` and artifact manifests; `--coverage` checks documented feature/example parity.',
    example: './bin/lite verify --coverage',
    exitCodes: 'Exit 0 when verified manifests and coverage gates match.',
  },
  {
    name: 'docs',
    synopsis: './bin/lite docs [QUERY|--json|--render-json|--modules-json|--check]',
    summary: 'Searches repository Markdown documentation, extracts clean HTML/TOC/module API JSON via `util/markdown-html` and `util/docgen`, or validates all local links with `--check`.',
    example: './bin/lite docs --check',
    exitCodes: 'Exit 0 when query/generation succeeds or all Markdown links and anchors resolve.',
  },
  {
    name: 'doctor',
    synopsis: './bin/lite doctor [--docs]',
    summary: 'Checks repository health, compiler seed integrity, layout consistency, and documentation structure.',
    example: './bin/lite doctor',
    exitCodes: 'Exit 0 when all repository health checks pass.',
  },
  {
    name: 'bench & release',
    synopsis: './bin/lite bench OUTPUT [FILTER] | ./bin/lite release OUTPUT [TAG]',
    summary: 'Benchmarks verified compiler workloads (`bench`) or packages a reproducible source snapshot (`release`).',
    example: './bin/lite bench /tmp/lite-bench.json',
    exitCodes: 'Exit 0 on successful report or archive creation.',
  },
];

export type ToolsBuildOutput = Readonly<{
  html: string;
  searchEntries: readonly SearchEntry[];
}>;

/** Builds `tools/index.html` and search entries for Lite CLI and developer tooling. */
export function buildToolsSection(options: Readonly<{
  repoUrl: string;
  rev: SourceRevision;
  lightSwitchShine: boolean;
}>): ToolsBuildOutput {
  const { repoUrl, rev, lightSwitchShine } = options;

  const cliCards = CLI_COMMANDS.map((cmd) => `<article class="portal-card tools-cmd-card" id="cmd-${escapeHtml(cmd.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase())}">
  <div class="portal-card-head">
    <h3><code>./bin/lite ${escapeHtml(cmd.name)}</code></h3>
    <span class="status-pill status-pill-universal">CLI</span>
  </div>
  <pre class="code-block"><code>${escapeHtml(cmd.synopsis)}</code></pre>
  <p>${escapeHtml(cmd.summary)}</p>
  <pre class="code-block"><code>$ ${escapeHtml(cmd.example)}</code></pre>
  <div class="portal-card-foot">
    <span class="code-card-meta">${escapeHtml(cmd.exitCodes)}</span>
  </div>
</article>`).join('\n');

  const repoVscodeHref = repoUrl ? `${repoUrl}/tree/main/editors/vscode` : '../';
  const repoSelfHostHref = repoUrl ? `${repoUrl}/blob/main/compiler/scripts/self-host.ts` : '../';

  const body = `<div class="portal-layout">
  <aside class="portal-sidebar" aria-label="Tools navigation">
    <p class="portal-sidebar-title">Toolchain</p>
    <details class="portal-nav-group" open>
      <summary>Local Workflow</summary>
      <ul class="portal-nav-list">
        <li><a href="#cli">CLI Reference</a></li>
        <li><a href="#vscode">VS Code Extension</a></li>
        <li><a href="#playground-host">Browser Play &amp; Worker</a></li>
        <li><a href="#bootstrap">Self-Hosting Ladder</a></li>
      </ul>
    </details>
    <details class="portal-nav-group" open>
      <summary>CLI Commands</summary>
      <ul class="portal-nav-list">
        ${CLI_COMMANDS.map((c) => `<li><a href="#cmd-${escapeHtml(c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase())}">${escapeHtml(c.name)}</a></li>`).join('\n        ')}
      </ul>
    </details>
  </aside>

  <article class="md-prose">
    <section id="overview">
      <h1>Lite Toolchain &amp; Developer Workflow</h1>
      <p class="hero-lead">
        Zero-ceremony CLI runner, strict TS/C emitters, idempotent formatter, VS Code syntax highlighting,
        in-browser Play host, and three-generation self-hosting verification.
      </p>
      <div class="portal-grid">
        <a class="portal-card" href="#cli">
          <div class="portal-card-head"><strong>CLI Router</strong><span class="status-pill status-pill-shipped">bin/lite</span></div>
          <p>Run, compile, check, format, test, verify, and check docs from one command.</p>
        </a>
        <a class="portal-card" href="#vscode">
          <div class="portal-card-head"><strong>VS Code Extension</strong><span class="status-pill status-pill-selected">VSIX</span></div>
          <p>Declarative TextMate highlighting for <code>.lt</code>, <code>.lts</code>, and <code>.lite</code> files.</p>
        </a>
        <a class="portal-card" href="#playground-host">
          <div class="portal-card-head"><strong>Playground &amp; Play</strong><span class="status-pill status-pill-play">Web Worker</span></div>
          <p>Client-side TS &amp; C compilation with <code>extra/canvas</code> pixels and <code>extra/audio</code> synthesis.</p>
        </a>
      </div>
    </section>

    <section class="section" id="cli">
      <div class="section-head">
        <h2>CLI Reference (<code>./bin/lite</code>)</h2>
        <span class="code-card-meta">Requires Node.js 22+</span>
      </div>
      <p>
        Run <code>./bin/lite &lt;command&gt;</code> from the repository root. Direct compiler wrappers are also available at
        <code>./bin/lite-compile</code>, <code>./bin/lite-compile-ts</code>, and <code>./bin/lite-compile-c</code>.
      </p>
      <div class="portal-grid-2">
        ${cliCards}
      </div>
    </section>

    <section class="section" id="vscode">
      <div class="section-head">
        <h2>VS Code Extension (<code>editors/vscode</code>)</h2>
        <span class="status-pill status-pill-selected">TextMate Grammar</span>
      </div>
      <p>
        The local Lite extension provides approximate lexical highlighting for <code>.lt</code>, <code>.lts</code>, and legacy <code>.lite</code>
        files without spawning a language server. It handles nested block comments, raw fenced comments, multiline double-quoted strings,
        colon-prefixed floor operators (<code>:/</code>, <code>:%</code>, <code>:/=</code>, <code>:%=</code>), and <code>@tag</code> loop markers.
      </p>
      <pre class="code-block"><code>$ cd editors/vscode
$ npm ci &amp;&amp; npm test &amp;&amp; npm run package
# Install generated lite-0.1.1.vsix via VS Code: Extensions -&gt; Install from VSIX...</code></pre>
      <p><a href="${escapeHtml(repoVscodeHref)}">Browse <code>editors/vscode</code> source &rarr;</a></p>
    </section>

    <section class="section" id="playground-host">
      <div class="section-head">
        <h2>Browser Playground &amp; Lite Play Protocol</h2>
        <span class="status-pill status-pill-play">Worker</span>
      </div>
      <p>
        The static site ships a stripped self-hosted compiler in <code>runtime/compiler.js</code>, C emitter in <code>runtime/compiler-c.js</code>,
        stdlib snapshot in <code>runtime/stdlib.json</code>, and isolated Web Worker runner in <code>runtime/worker.js</code>.
        TypeScript inspection supports <strong>Program</strong>, <strong>Portable</strong>, and <strong>Full</strong> code views.
      </p>
      <p>
        Interactive graphics and audio programs import <a href="../modules/extra/canvas.html"><code>extra/canvas</code></a>,
        <a href="../modules/extra/board.html"><code>extra/board</code></a>, and <a href="../modules/extra/audio.html"><code>extra/audio</code></a>,
        defining optional top-level hooks:
      </p>
      <div class="md-table-wrap">
        <table>
          <thead><tr><th>Hook</th><th>Signature</th><th>Host Event</th></tr></thead>
          <tbody>
            <tr><td><code>onCanvasInit</code></td><td><code>fn(): Unit</code></td><td>Called once before the first rendered Play frame.</td></tr>
            <tr><td><code>onCanvasUpdate</code></td><td><code>fn(dt: Float): Int</code></td><td>Called each animation frame with delta seconds; non-zero stops loop.</td></tr>
            <tr><td><code>onCanvasKeyDown</code> / <code>Up</code></td><td><code>fn(key: String): Unit</code></td><td>Keyboard key event while canvas has focus.</td></tr>
            <tr><td><code>onCanvasPointerMove</code></td><td><code>fn(col: Int, row: Int): Unit</code></td><td>Pointer position mapped onto canvas cell coordinates.</td></tr>
            <tr><td><code>onCanvasPointerDown</code> / <code>Up</code></td><td><code>fn(col: Int, row: Int, button: Int): Unit</code></td><td>Pointer button press/release on canvas coordinates.</td></tr>
          </tbody>
        </table>
      </div>
      <p><a href="../playground/">Launch the Browser Playground &rarr;</a></p>
    </section>

    <section class="section" id="bootstrap">
      <div class="section-head">
        <h2>Self-Hosting &amp; Three-Generation Bootstrap</h2>
        <span class="status-pill status-pill-shipped">Fixed Point</span>
      </div>
      <p>
        Lite's compiler sources live in <code>compiler/src/*.lts</code> and compile against the verified seed in
        <code>compiler/bootstrap/compiler.ts</code>. To prove fixed-point self-hosting, the ladder script compiles
        the compiler through three consecutive generations and verifies identical SHA-256 outputs across generations:
      </p>
      <pre class="code-block"><code>$ node compiler/scripts/self-host.ts</code></pre>
      <p>
        Every generated TypeScript compiler generation is also validated against strict TypeScript checks in <code>igniter/tsconfig.json</code>.
        <a href="${escapeHtml(repoSelfHostHref)}">Inspect <code>compiler/scripts/self-host.ts</code> &rarr;</a>
      </p>
    </section>
  </article>

  <aside class="portal-toc" aria-label="On this page">
    <p class="portal-toc-title">On This Page</p>
    <ul>
      <li><a href="#overview">Overview</a></li>
      <li><a href="#cli">CLI Reference</a></li>
      <li><a href="#vscode">VS Code Extension</a></li>
      <li><a href="#playground-host">Browser Play &amp; Worker</a></li>
      <li><a href="#bootstrap">Self-Hosting Ladder</a></li>
    </ul>
  </aside>
</div>`;

  const html = renderPage({
    title: 'Tools — Lite',
    description: 'CLI commands, formatter, test & verify gates, VS Code extension, Play host protocol, and self-hosting bootstrap.',
    basePath: '../',
    active: 'tools',
    repoUrl,
    rev,
    body,
    lightSwitchShine,
  });

  const searchEntries: SearchEntry[] = [
    ...CLI_COMMANDS.map((cmd) => ({
      kind: 'tool' as const,
      title: `lite ${cmd.name}`,
      subtitle: cmd.summary,
      href: `tools/#cmd-${encodeURIComponent(cmd.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase())}`,
      keywords: `cli bin lite ${cmd.name} ${cmd.synopsis} ${cmd.example}`,
      badge: 'CLI',
    })),
    {
      kind: 'tool',
      title: 'VS Code Lite Extension',
      subtitle: 'TextMate syntax highlighting extension in editors/vscode/',
      href: 'tools/#vscode',
      keywords: 'vscode editor syntax highlight vsix textmate',
      badge: 'Editor',
    },
    {
      kind: 'tool',
      title: 'Self-Hosting 3-Generation Ladder',
      subtitle: 'Compile compiler/src/ through three fixed-point generations',
      href: 'tools/#bootstrap',
      keywords: 'self-host bootstrap fixed-point compiler',
      badge: 'Compiler',
    },
  ];

  return { html, searchEntries };
}
