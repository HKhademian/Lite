# Compiler source roots

Each target manifest selects exactly one Lite source root. The generated TS
compiler follows that root's `import` clauses and compiles the graph; the host
does not assemble, scan or order compiler source files.

```json
{
  "target": "ts",
  "files": ["../src/ts-root.lts"]
}
```

`files` is retained as a one-element schema field for target identification.
The TS and C roots each select a target driver. Both are built by the single
verified TS igniter; the C result is a TS-hosted C emitter, not a native
self-hosted compiler.

The compiler's Lite graph visitor owns import parsing, traversal and the two
visit states. The host's `readSource` callback only resolves a relative path,
canonicalizes it, reads strict UTF-8 bytes and returns the source unit. An
optional trace records the files and import edges actually read by Lite. The
host hashes those exact bytes, revalidates them and the resolved edges on cache
hits, and publishes the generated compiler only after strict TypeScript checks.

The manifests are loaded through `loadManifest`. Source traversal belongs to
Lite and the host's `readSource` callback; no TypeScript helper expands imports
or assembles a line map.

## Manifest rules

- The top level has exactly `target` and `files`; unknown keys are rejected.
- `target` is `ts` or `c` and must match the requested backend.
- `files` contains exactly one relative UTF-8 path using `/` separators.
- That path resolves relative to this manifest; imports resolve relative to
  their importing Lite file.
- A root missing from the repository or a manifest with multiple roots is an
  error. Imported dependency resolution is performed by Lite through
  `readSource`.

The Lite import contract, visibility rules, cycle behavior and remaining module
limitations are described in [module-import-stages.md](../module-import-stages.md).
