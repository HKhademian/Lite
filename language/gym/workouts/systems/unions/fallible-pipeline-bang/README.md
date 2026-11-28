# Fallible Configuration Pipeline with Postfix `!` & `ToError`

Read integers `port` and `timeout`. Validate `port` in `1024..65535` (returning `.err(.BadPort(port))` on `PortErr`) and `timeout` in `1..300` (returning `.err(.BadTimeout(timeout))` on `TimeoutErr`).

Implement `type/error.ToError` on both error enums, chain both validations in `buildCfg(...): String!` using postfix `!`, and output either `"port=<p> timeout=<t>"` or `e.format()`.
