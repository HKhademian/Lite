# Compiler architecture and performance roadmap

Status: **foundation phases #1–#4 + #6a complete (2026-11-23); v2 pipeline (#5 and #6b) documented and ready**. Native C11 self-compilation of the full compiler (`c-root.lts` → `compiler.c`) dropped from **1977 ms** (original baseline) / **871 ms** (post-Tier-1 baseline) down to **321.3 ms** (**6.15×** faster overall; **2.71×** faster across #1–#4 + #6a), with 3-generation byte-for-byte fixed points on both TS and C11.

## Overview

The active Lite compiler ([`compiler/src/frontend.lts`](lite://repo/lib/lite/compiler/frontend.lt), [`compiler/src/frontend-expr.lts`](lite://repo/lib/lite/compiler/frontend-expr.lt), [`compiler/src/frontend-types.lts`](lite://repo/lib/lite/compiler/frontend-types.lt), [`compiler/src/emit-ts.lts`](lite://repo/lib/lite/compiler/emit-ts.lt), [`compiler/src/emit-c.lts`](lite://repo/lib/lite/compiler/emit-c.lt)) now uses $O(1)$ scoped symbol indexing, single-pass brace matching, canonical type and component memoization, 16-byte length-prefixed C11 `lt_str` strings, an $O(V + E)$ call-graph BFS worklist for reachability, $O(1)$ `Set<String>` helper queries, and an $O(1)$ C11 builtin rewrite map.

Every phase below eliminates a structural bottleneck rather than adding heuristic flags, while preserving strict dual-target TS/C11 parity, all 94 corpus contracts, and 3-generation self-hosting fixed points.

## Execution order & measured results

| Phase | Upgrade | Target area | Native C→C self-compile (min) | Status |
|---|---|---|---|---|
| Baseline | Original compiler before algorithmic cleanup | Full compiler | `1977 ms` | Baseline |
| Tier-1 | $O(1)$ Map/Set tombstones, `Set<String>` buckets, MRU UTF-8 cache, `lib/util/collections.lts` | [`emit-c.lts`](lite://repo/lib/lite/compiler/emit-c.lt), [`reachability.lts`](lite://repo/lib/lite/compiler/reachability.lt) | `871 ms` (`2.27×`) | Done (`b791a650`) |
| **#1** | Scoped $O(1)$ `SymbolTable` with undo-stack shadowing and trace-safety invariants | [`symbol-table.lts`](lite://repo/lib/lite/compiler/symbol-table.lt), [`frontend.lts`](lite://repo/lib/lite/compiler/frontend.lt), [`frontend-expr.lts`](lite://repo/lib/lite/compiler/frontend-expr.lt), [`trace-safety.lts`](lite://repo/lib/lite/compiler/trace-safety.lt) | `724.9 ms` (`2.73×`) | Done (`5af84147`) |
| **#2** | Single-pass `BraceIndex` (`Map<Int, Int>`) per source file | [`frontend-syntax.lts`](lite://repo/lib/lite/compiler/frontend-syntax.lt) | `587.7 ms` (`3.36×`) | Done (`3e4cb62c`) |
| **#3** | Canonical `TypeCache` interning (`cStructTag`, `cValueType`, `tsFunctionType`, parsed tuple/record component tables) | [`frontend-types.lts`](lite://repo/lib/lite/compiler/frontend-types.lt) | `466.5 ms` (`4.24×`) | Done (`ea0b9907`) |
| **#4** | Fat 16-byte length-prefixed C11 strings (`lt_str`) with compile-time `byte_len`/`cp_len`, 8-byte word hashing, and 1-byte `lt_text_eq` fast path | [`c-literals.lts`](lite://repo/lib/lite/compiler/c-literals.lt), [`frontend-ir.lts`](lite://repo/lib/lite/compiler/frontend-ir.lt), [`frontend-types.lts`](lite://repo/lib/lite/compiler/frontend-types.lt), [`emit-c.lts`](lite://repo/lib/lite/compiler/emit-c.lt) | `390.9 ms` (`5.06×`) | Done (`89dc26fe`) |
| **#6a** | $O(V + E)$ worklist BFS reachability, `Set<String>` helper queries, $O(1)$ C builtin rewrite map, and jump-scanning passes | [`reachability.lts`](lite://repo/lib/lite/compiler/reachability.lt), [`modules.lts`](lite://repo/lib/lite/compiler/modules.lt), [`emit-c.lts`](lite://repo/lib/lite/compiler/emit-c.lt) | `321.3 ms` (`6.15×`) | Done (`88231e13`) |
| **#5** | Full-language single-pass tokenized frontend (`Source -> Tokens`) | [`lexer.lts`](lite://repo/lib/lite/compiler/lexer.lt), frontend parser | — | Documented (next v2 frontier) |
| **#6b** | Decoupled `Tokens -> Arena AST -> TypeChecker -> Typed IR -> TS/C Backends` | Compiler v2 frontend & emitters | — | Documented (next v2 frontier) |

---

## Foundation phases (#1, #2, #3, #4, #6a)

### Phase #1 — Scoped `SymbolTable` with undo-stack shadowing

Replace linear symbol scans (`findFunction`, `findAlias`, `localIndex`, `localsHasAnyUnready`, `mergeOuterCallableUpdatesFromCode`) with $O(1)$ hash-indexed tables that maintain exact lexical shadowing and scope invariants:

- **`fnByName: Map<String, Int>`**: monotonic top-level function index ($O(1)$ `findFunction`).
- **`localByName: Map<String, Int>` + undo log**: pushing a local saves `(name, prevIdx)`; popping a lexical block unwinds the undo log back to the saved frame height, restoring shadowed outer bindings in $O(\text{block locals})$.
- **`aliasByName: Map<String, Int>` + undo log**: identical $O(1)$ lexical shadowing for top-level and block-scoped `type` / `record` / `enum` declarations.
- **Scope invariants (`unreadyCount`, `callableLocalCount`, runtime index)**: maintained on binding push, initialization upgrade, and block pop so `localsHasAnyUnready` and `mergeOuterCallableUpdatesFromCode` run in $O(1)$ on statements with no unready or callable locals in scope.

### Phase #2 — Single-pass `BraceIndex` per source file

Scan each module source once in $O(N)$ (respecting string literals, escapes, nested `/* ... */` comments, and raw `/*# ... #*/` comments) with an explicit stack to populate `braceEnd: Map<Int, Int>` mapping every opening `{` offset to the offset immediately after its matching `}`.

- `scanBraceEnd`, `skipBraceBlock`, `scanRawIfChainEnd`, `scanRawMatchEnd`, and `scanRawLoopEnd` become $O(1)$ lookups per brace instead of rescanning nested block bodies at every nesting depth.
- Unclosed braces preserve exact diagnostic positions and messages.

### Phase #3 — Canonical `TypeCache` metadata interning

Canonical type kinds (`"Tuple<...>"`, `"Record<...>"`, `"List<...>"`, `"fn(...):..."`) are currently re-parsed and re-hashed thousands of times per compilation even though a program has only ~50–150 distinct types.

- Memoize `cStructTag` / `cStructHash`, `containsFnKind`, and related canonical type queries in `Map<String, ...>` caches keyed by canonical kind string.
- Reuses cleanly as the interned type table in Phase #6b.

### Phase #4 — Fat length-prefixed strings in C11 (`lt_str`)

Replaced bare `const char *` plus mandatory `lt_utf8_cache` probes with a 16-byte register-passed value struct carrying NUL-terminated storage and exact lengths:

```c
typedef struct {
    const char *data;  /* Always NUL-terminated for zero-copy C/POSIX interop */
    uint32_t byte_len; /* Exact UTF-8 byte length */
    int32_t cp_len;    /* Exact Unicode scalar length when >= 0 (ASCII iff cp_len == (int32_t)byte_len), -1 if lazy */
} lt_str;
```

- Compile-time string literals (`LT_STR_LIT("...", cp)`) carry exact `byte_len` (via C `sizeof`) and `cp_len` with zero runtime scan.
- `lt_text_eq` rejects unequal lengths and mismatched first bytes inline without calling `memcmp`; `lt_text_hash` hashes 8-byte words via `memcpy`.
- `lt_text_length` and ASCII `lt_text_at` (backed by compile-time `lt_ascii_tbl`) / `lt_text_slice` / `lt_c_text_*` execute in $O(1)$ without touching the UTF-8 cursor cache.
- `lite_concat` and `lt_c_text_join` compute exact output sizes without `strlen` and propagate `cp_len`.
- Verified with dedicated [`compiler/tests/codegen/c-backend-strings.test.lts`](lite://repo/compiler/tests/codegen/c-backend-strings.test.lts) covering ASCII, multi-byte UTF-8, default zero-init, `Map`/`Set`, and string-backed enums.

### Phase #6a — Structured call-graph BFS, `Set<String>` helper queries, and $O(1)$ builtin lowering

Eliminated the dominant downstream emitted-code string-scraping bottlenecks across [`reachability.lts`](lite://repo/lib/lite/compiler/reachability.lt), [`modules.lts`](lite://repo/lib/lite/compiler/modules.lt), and [`emit-c.lts`](lite://repo/lib/lite/compiler/emit-c.lt):

- Replaced the repeated whole-program fixpoint loops in `filterReachableItemsWithConfig` and `closeReachableTokens` with a single-pass function/declaration index plus an $O(V + E)$ BFS worklist (`closeReachableGraph`).
- Replaced pipe-delimited `|...|` helper strings and repeated `strstr` queries in `emit-c.lts` with `targetHelperCallSet` (`Set<String>`), eliminating redundant per-item `targetCodeCalls` and list-helper re-scans.
- Replaced the 62-branch character-by-character `normalizeCBuiltinCalls` scanner with an $O(1)$ `Map<String, String>` rewrite table and SIMD `indexOfText` jumping (also applied to `emitArithmeticTemporaries`, `injectCFnTemps`, `extractCTypeAnnotations`, and `extractCHoistedFns`).
- Kept emitted TS and C11 behavior identical across all 94 corpus contracts and 3-generation fixed points while reducing `emit-c.lts` + `reachability.lts` + `modules.lts` by 93 net lines.

---

## Future v2 frontend architecture (#5 and #6b)

Once **#1–#4** and **#6a** are landed and verified, the remaining structural debt is the fused 16.7k-line character-by-character parser/emitter in [`frontend.lts`](lite://repo/lib/lite/compiler/frontend.lt) and [`frontend-expr.lts`](lite://repo/lib/lite/compiler/frontend-expr.lt). Phases **#5** and **#6b** separate the compiler into a textbook multi-pass pipeline that reuses `#1`'s `SymbolTable` and `#3`'s `TypeCache` directly.

### Phase #5 — Full-language single-pass lexer (`Source -> Tokens`)

Upgrade [`compiler/src/lexer.lts`](lite://repo/lib/lite/compiler/lexer.lt) from the early bootstrap subset to the complete Lite grammar:

1. **Flat token stream (`List<Token>`)**:
   - Store `kind: Int` (enum/integer tag rather than string comparisons), `start: Int`, `end: Int`, `line: Int`, `col: Int`, and `matchIdx: Int` (pre-matched partner token index for `{`/`}`, `(`/`)`, `[`/`]`).
   - Slice token text lazily from `source` only when needed (identifiers, decoded strings, numeric literals).
2. **Full-language coverage**:
   - All keywords (`pub`, `var`, `mut`, `type`, `record`, `enum`, `fn`, `if`, `else`, `match`, `loop`, `as`, `break`, `continue`, `return`, `then`, `finally`, `import`, `self`, `and`, `or`, `not`, `true`, `false`).
   - All operators and compound assignments (`:=`, `+=`, `-=`, `*=`, `/=`, `%=`, `:/=`, `:%=`, `**`, `..`, `..=`, `==`, `=!=`, `<!`, `<!=`, `>!`, `>!=`, `|>`, `?!`, `=>`, `@tag`).
   - Nested `/* ... */` and raw `/*# ... #*/` comments captured into a side-channel `List<CommentToken>` keyed by token index so emitted comment placement matches existing formatting rules.
3. **Verification gate**:
   - Differential lexer test across every `.lts` file in `compiler/src/`, `lib/`, `tools/`, `site/`, `language/`, and `igniter/tests/compiler/` verifying token spans, line/column numbers, comment preservation, and malformed-token diagnostics.

### Phase #6b — Decoupled arena AST and typed IR (`Tokens -> AST -> Typed IR -> Backends`)

Split parsing, typechecking, optimization, and code generation into explicit, target-agnostic stages:

```text
Source (.lts)
  │
  ▼  [Phase #5: lexer.lts]
Tokens (flat List<Token> with pre-matched brackets + attached comments)
  │
  ▼  [Phase #6b.1: ast-parser.lts]
Arena AST (flat List<ExprNode>, List<StmtNode>, List<DeclNode>, List<TypeNode>)
  │
  ▼  [Phase #6b.2: typecheck.lts — reuses #1 SymbolTable & #3 TypeCache]
Typed IR (flat List<IrExpr>, List<IrStmt>, List<IrFn> with resolved SymbolId & TypeId)
  │
  ▼  [Phase #6b.3: ir-opt.lts]
Optimized Typed IR (constant folding, reachability, dead-store elimination, loop-expr unwrapping)
  │
  ├──▶ [emit-ts.lts] ──▶ TypeScript
  └──▶ [emit-c.lts]  ──▶ ISO C11 (using #4 lt_str)
```

#### Key design principles for #6b
- **Arena-indexed nodes (no heap-pointer trees):** Lite has fast value-semantic `List<Record>` storage without cyclic references. Representing AST and IR nodes as integer indices into flat per-kind arenas (`exprId: Int`, `stmtId: Int`, `typeId: Int`, `symId: Int`) works naturally on both TS and C11 with zero GC or ownership complexity.
- **Target-agnostic frontend:** Zero `if target == TARGET_TS` branches inside parsing or typechecking. Target differences live strictly in `emit-ts.lts` and `emit-c.lts`, guaranteeing dual-target parity by construction.
- **Real IR passes instead of string surgery:**
  - Definite initialization and execution-trace safety (`trace-safety`) operate directly on `IrExpr`/`IrStmt` symbol IDs instead of stripping arrow bodies from generated JS/C text.
  - Reachability and dead-code pruning operate on a real call/reference graph over `SymbolId`.
  - Loop-expression accumulator unwrapping, constant folding, and pure dead-store pruning run once on `Typed IR` and automatically benefit both TS and C11.
- **Staged migration & differential parity gates:**
  1. **Slice 1 (Lexer + AST parser):** Parse every `.lts` file in the repo into the arena AST and assert round-trip structural invariants + exact syntax diagnostics.
  2. **Slice 2 (Typechecker → Typed IR):** Resolve symbols and types using `#1` (`SymbolTable`) and `#3` (`TypeCache`), verifying identical type/init/trace diagnostics on all 25 rejection corpus cases and every `reject-*.lts` verification case.
  3. **Slice 3 (Backends on Typed IR):** Lower `Typed IR` to TS and C11 behind an opt-in flag (`--frontend=v2`), differentially testing runtime behavior and strict `tsc` / `cc -std=c11 -Wall -Wextra -Werror` across all 69 program corpus cases, `./bin/lite verify`, and `site/build.test.ts`.
  4. **Slice 4 (Cutover & 3-generation fixed point):** Switch default frontend to v2, verify 3-generation TS and C11 self-hosting fixed points, refresh [`compiler/bootstrap/`](lite://doc/compiler/bootstrap-readme), and retire the legacy character-offset frontend modules.
