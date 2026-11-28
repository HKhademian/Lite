# Drill: Nominal `interface`, `impl` Defaults & `dyn` Dispatch

Implement `Show` for `MetricBox { tag: String; val: Int; }` so `renderDyn(box: dyn Show)` works cleanly and uses `Show`'s default `banner` method (`"[" + self.label() + "]"`).
