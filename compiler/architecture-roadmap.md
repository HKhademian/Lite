# Compiler architecture and performance roadmap

Status: **active implementation roadmap, 2026-11-23**. Phases **#1**, **#2**, **#3**, **#4**, and **#6a** are genuine data-structure and runtime upgrades on the active compiler; phases **#5** and **#6b** document the decoupled v2 frontend pipeline to execute once those foundations are in place.

## Overview

The active Lite compiler ([`compiler/src/frontend.lts`](lite://repo/compiler/src/frontend.lts), [`compiler/src/frontend-expr.lts`](lite://repo/compiler/src/frontend-expr.lts), [`compiler/src/frontend-types.lts`](lite://repo/compiler/src/frontend-types.lts), [`compiler/src/emit-ts.lts`](lite://repo/compiler/src/emit-ts.lts), [`compiler/src/emit-c.lts`](lite://repo/compiler/src/emit-c.lts)) currently parses raw UTF-8 source by character offset while fusing typechecking and target TS/C11 code emission. Downstream passes ([`compiler/src/trace-safety.lts`](lite://repo/compiler/src/trace-safety.lts), [`compiler/src/reachability.lts`](lite://repo/compiler/src/reachability.lts), [`compiler/src/emit-c.lts`](lite://repo/compiler/src/emit-c.lts)) then re-scan emitted code strings to recover dependencies, helper calls, and type annotations.

Every phase below eliminates a structural bottleneck rather than adding heuristic flags, while preserving strict dual-target TS/C11 parity, all 94 corpus contracts, and 3-generation self-hosting fixed points.

## Execution order

| Phase | Upgrade | Target area | Status |
|---|---|---|---|
| **#1** | Scoped $O(1)$ `SymbolTable` with undo-stack shadowing and scope invariants | [`frontend-ir.lts`](lite://repo/compiler/src/frontend-ir.lts), [`frontend.lts`](lite://repo/compiler/src/frontend.lts), [`frontend-expr.lts`](lite://repo/compiler/src/frontend-expr.lts), [`trace-safety.lts`](lite://repo/compiler/src/trace-safety.lts) | Planned (next) |
| **#2** | Single-pass `BraceIndex` (`Map<Int, Int>`) per source file | [`frontend-syntax.lts`](lite://repo/compiler/src/frontend-syntax.lts), [`frontend.lts`](lite://repo/compiler/src/frontend.lts), [`frontend-inference.lts`](lite://repo/compiler/src/frontend-inference.lts) | Planned |
| **#3** | Canonical `TypeCache` interning (`cStructTag`, `containsFnKind`, type metadata) | [`frontend-types.lts`](lite://repo/compiler/src/frontend-types.lts), [`emit-c.lts`](lite://repo/compiler/src/emit-c.lts) | Planned |
| **#4** | Fat length-prefixed C11 strings (`lt_str`) | [`c-literals.lts`](lite://repo/compiler/src/c-literals.lts), [`emit-c.lts`](lite://repo/compiler/src/emit-c.lts) | Planned |
| **#6a** | Structured IR metadata on `Parsed` and `Item` (eliminate emitted-code string scraping) | [`frontend-ir.lts`](lite://repo/compiler/src/frontend-ir.lts), [`frontend-expr.lts`](lite://repo/compiler/src/frontend-expr.lts), [`trace-safety.lts`](lite://repo/compiler/src/trace-safety.lts), [`reachability.lts`](lite://repo/compiler/src/reachability.lts), [`emit-c.lts`](lite://repo/compiler/src/emit-c.lts) | Planned |
| **#5** | Full-language single-pass tokenized frontend (`Source -> Tokens`) | [`lexer.lts`](lite://repo/compiler/src/lexer.lts), frontend parser | Documented for after #1–#4 + #6a |
| **#6b** | Decoupled `Tokens -> Arena AST -> TypeChecker -> Typed IR -> TS/C Backends` | Compiler v2 frontend & emitters | Documented for after #1–#4 + #6a |

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

Replace bare `const char *` plus the global 256-slot `lt_utf8_cache` with a compact value struct carrying NUL-terminated storage and exact lengths:

```c
typedef struct {
    const char *data; /* Always NUL-terminated for zero-copy C/POSIX interop */
    int64_t byte_len; /* Exact UTF-8 byte length */
    int64_t cp_len;   /* Exact Unicode scalar length when >= 0 (ASCII iff cp_len == byte_len), -1 if lazy */
} lt_str;
```

- Compile-time string literals carry exact `byte_len` and `cp_len` with zero runtime scan.
- `lt_text_eq` rejects unequal lengths in 1 cycle and uses pointer equality or `memcmp`.
- `lt_text_length` and ASCII `lt_text_at` / `lt_text_slice` execute in $O(1)$ with zero global cache traffic.
- `lt_str_concat` and `lt_list_str_join` compute output sizes without `strlen`.
- Benefits every C11-compiled Lite program, not only the compiler.

### Phase #6a — Structured IR metadata on `Parsed` and `Item`

Record structured runtime references, helper call tokens, and C type tags directly during frontend resolution rather than re-parsing generated C/TS strings in downstream passes:

- Eliminate string-scraping scans (`extractCTypeAnnotations`, `codeReachableTokensSet`, `targetCodeCalls`, `extractExprDepsPair`) where structured side-channel sets/lists can be populated directly at emission time.
- Keeps emitted TS and C11 bytes identical and preserves all 94 corpus contracts and 3-generation fixed points.

---

## Future v2 frontend architecture (#5 and #6b)

Once **#1–#4** and **#6a** are landed and verified, the remaining structural debt is the fused 16.7k-line character-by-character parser/emitter in [`frontend.lts`](lite://repo/compiler/src/frontend.lts) and [`frontend-expr.lts`](lite://repo/compiler/src/frontend-expr.lts). Phases **#5** and **#6b** separate the compiler into a textbook multi-pass pipeline that reuses `#1`'s `SymbolTable` and `#3`'s `TypeCache` directly.

### Phase #5 — Full-language single-pass lexer (`Source -> Tokens`)

Upgrade [`compiler/src/lexer.lts`](lite://repo/compiler/src/lexer.lts) from the early bootstrap subset to the complete Lite grammar:

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
