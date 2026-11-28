# Lexical Context & Overloaded Audit Logger

Read an environment string `env`, an integer event code `code`, and a label string `msg`.

Thread a lexical `context(envTag: String, hits: mut Int)` across `emitAudit(...)`, format `code` and `msg` via overloaded `fmt(Int)` / `fmt(String)` helpers, override `envTag` to `env` inside `context (envTag = env) { ... }`, and output two sequential audit lines (`"<env>#<hits>:<formatted>"`).
