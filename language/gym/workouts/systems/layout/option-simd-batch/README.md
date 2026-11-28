# Option + SoA & SIMD Batch

Read four integers `x0 x1 x2 x3` and a `scale` integer from stdin. Store them inside an `soa.SoA<Sample>` column (`type/soa`, `val: Int32`), multiply all 4 lanes via `simd.Int32x4.load` and `.mul(simd.Int32x4.splat(cast<Int32>(scale)))`, and reduce via `.reduceAdd()`.

Wrap a strictly positive total in `Option<Int>` (`.Some(total)`), otherwise `.None`, and print `total` when present or `"empty"` when absent.
