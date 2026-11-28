# Paths, Temp Workspaces, File I/O & `finally` Cleanup

Combine pure path math (`core/path`), aligned text columns (`type/string`), and host filesystem operations (`core/file`) guarded by `finally` cleanup.

## Walkthrough

1. `path.normalize`, `path.relative`, `path.stem`, and `path.withExt` perform pure path computations without touching disk.
2. `fs.makeTempDir("lite-showcase-")` returns a checked result tuple `(ok, path, error)`; failures exit explicitly with `io.exit(2)`.
3. `{ ... } finally { _ := fs.remove(tmp.path); }` ensures the temporary workspace is deleted on every exit path.

> [!IMPORTANT]
> Because `core/file` operates on the host OS filesystem (`CLI / Host OS`), run it locally via `./bin/lite run language/showcases/modules/filesystem/files-paths-and-cleanup.lts`! In the browser you can edit and click **Compile TS** to inspect the emitted code.

See [core/file](lite://module/core/file), [core/path](lite://module/core/path), and [Handbook: Imports, Visibility & I/O](lite://handbook/imports-visibility-and-io).
