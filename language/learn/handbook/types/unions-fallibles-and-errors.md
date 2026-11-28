# Unions, Fallibles & Errors

Lite keeps optionality, alternative value shapes, and recoverable errors explicit and statically checked—with zero null references and deterministic cleanup on every error return.

## Plain Unions (`A | B`) & Flow Narrowing

Combine arbitrary types with `A | B` (and optional leading `|` formatting). Union types normalize automatically across member order, flattening, and duplicates. Narrow a union via `if x: Member`, early-exit guards, or exhaustive `match`:

```lite
io := import "core/io";

Value := alias Int | String | Bool;

describe := fn(v: Value): String {
    match v {
        n: Int { "int:" + (n + 1).toText() }
        s: String { "str:" + s }
        b: Bool { if b { "bool:true" } else { "bool:false" } }
    }
};

io.outputLine(describe(41), describe("lite"), describe(false));
```

> [!NOTE]
> On the current C11 backend, match the full union value directly (as shown above) rather than passing a residual flow-narrowed union binding (for example, after `if v: Int { return ... }`) into `match v { ... }`, which is a tracked C11 typedef-emission limitation in [compiler gaps](lite://doc/compiler/gaps).

## Optional Values (`Option<T>`)

Use [type/option](lite://module/type/option) (`Option<T>`, `.Some(v)`, `.None`) whenever absence is a normal outcome. Both `if .Some(x) := opt` and `match` extract the payload cleanly:

```lite
io := import "core/io";
opt := import "type/option";

findFirstPos := fn(xs: List<Int>): opt.Option<Int> {
    loop xs as v {
        if v > 0 { return .Some(v); }
    }
    .None
};

pick := findFirstPos([-3, 0, 14, 9]);
out := if .Some(v) := pick { v * 2 } else { 0 };
io.outputLine(pick.isSome(), out);
```

## Fallible Functions (`T ! E`, `T!`), Postfix `!`, & `else(err)` Recovery

Functions that may fail return `SuccessType ! ErrorType` or `SuccessType!` (shorthand for `SuccessType ! Error` using [type/error](lite://module/type/error)). Custom domain errors can implement `ToError` so postfix `!` converts and propagates automatically up to a `T!` caller, while `else(err)` recovers locally:

```lite
io := import "core/io";
errs := import "type/error";

ParseErr := enum { Empty; Negative(Int); };
impl errs.ToError for ParseErr {
    toError := fn(self: ParseErr): errs.Error {
        match self {
            .Empty { errs.Error.new("ParseErr", "empty input") }
            .Negative(n) { errs.Error.withCode("ParseErr", "negative value " + n.toText(), 400) }
        }
    };
};

readPositive := fn(raw: String): Int ! ParseErr {
    if raw == "" { return .err(.Empty); }
    n := if raw == "-5" { -5 } else { 12 };
    if n < 0 { return .err(.Negative(n)); }
    n
};

doubleInput := fn(raw: String): Int! {
    v := readPositive(raw)!;
    v * 2
};

safeVal := doubleInput("-5") else(e) { 0 };
io.outputLine(
    match doubleInput("ok") { .ok(v) { v.toText() } .err(e) { e.format() } },
    match doubleInput("-5") { .ok(v) { v.toText() } .err(e) { e.format() } },
    safeVal
);
```

See [Union Normalization](lite://doc/union-normalization), [Union Membership](lite://doc/union-membership), and [Fallible Types & Error Composition](lite://doc/fallible-types-and-error-composition).

Try [Unions & Fallibles](lite://play/unions-and-fallibles) and the [verified Unions & Fallible Pipeline showcase](lite://play/example/showcase-unions-and-fallible-pipeline).

## Next Chapter

Continue to [Interfaces, Contexts & Overloading](lite://handbook/interfaces-contexts-and-overloading).
