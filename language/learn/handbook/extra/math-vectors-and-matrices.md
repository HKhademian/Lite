# Math, Vectors, Matrices & Grids

Lite provides pure, dual-target (TypeScript + C11) math, deterministic random generation, 2D/3D/4D vector algebra, 2×2/3×3/4×4 matrix transforms, and flat-backed 2D grids with identical numeric behavior across both backends.

## Core Math & Deterministic Randomness (`core/math`, `core/random`)

[core/math](lite://module/core/math) defines `PI`, `TAU`, `E`, `absInt`/`absFloat`, `minInt`/`maxInt`, `clampInt`/`clampFloat`, `floor`/`ceil`/`round`, `sqrt`, and `signInt`/`signFloat`.

[core/random](lite://module/core/random) provides an immutable, seedable Lehmer PRNG (`Rng`) whose state advances explicitly without hidden global entropy:

```lite
io := import "core/io";
math := import "core/math";
rng := import "core/random";

var r := rng.create(42);
a := rng.rangeInt(r, 1, 7);
r = a.next;
b := rng.rangeInt(r, 1, 7);
io.outputLine(a.value, b.value, math.clampInt(a.value + b.value, 2, 12));
```

## 2D, 3D & 4D Vector Math (`extra/vector`)

[extra/vector](lite://module/extra/vector) provides value-typed `Vec2`, `Vec3`, and `Vec4` tuples with constants (`ZERO2`, `ZERO3`, `UNIT_X3`, `UNIT_Y3`, `UNIT_Z3`), range-reduced trigonometry (`sinRad`, `cosRad`), arithmetic (`add2`, `sub2`, `scale2`, `dot2`, `cross2`, `dot3`, `cross3`), normalization, distance, reflection, and linear interpolation (`lerp2`, `lerp3`):

```lite
io := import "core/io";
vec := import "extra/vector";

a := vec.vec2(3.0, 4.0);
b := vec.vec2(1.0, 0.0);
sum := a.add(b);
io.outputLine(a.length(), a.dot(b), sum.x, sum.y);
```

## 2×2, 3×3 & 4×4 Matrix Transforms (`extra/matrix`)

[extra/matrix](lite://module/extra/matrix) builds on `extra/vector` with `Mat2`, `Mat3`, and `Mat4` value types for 2D affine transforms (`translate2`, `scale2`, `rotate2`, `transformPoint2`) and 3D pipelines (`translate3`, `scale3`, `rotateX`, `rotateY`, `rotateZ`, `mul4`, `transpose4`, `det3`, `perspective`, `lookAt`):

```lite
io := import "core/io";
vec := import "extra/vector";
mat := import "extra/matrix";

move := mat.translate2(10.0, 20.0);
scale := mat.scale2(2.0, 3.0);
xform := mat.mul3(move, scale);
pt := mat.transformPoint2(xform, vec.vec2(4.0, 5.0));
io.outputLine(pt.x, pt.y);
```

## Flat-Backed 2D Grids (`extra/grid`)

[extra/grid](lite://module/extra/grid) stores dense 2D integer (`IntGrid`) and floating-point (`FloatGrid`) tilemaps, heightfields, and cellular automata in contiguous flat storage with bounds-checked reads/writes (`inIntBounds`, `getIntOr`, `setInt`), rectangle fills (`fillIntRect`), value counting (`countIntValue`), and bulk copies (`copyInts`):

```lite
io := import "core/io";
grid := import "extra/grid";

g := grid.createInts(6, 4, 0);
grid.fillIntRect(g, 1, 1, 3, 2, 1);
io.outputLine(grid.getIntOr(g, 2, 2, -1), grid.countIntValue(g, 1));
grid.destroyInts(g);
```

Explore the module references: [core/math](lite://module/core/math), [core/random](lite://module/core/random), [extra/vector](lite://module/extra/vector), [extra/matrix](lite://module/extra/matrix), and [extra/grid](lite://module/extra/grid).

## Next Chapter

Continue to [Data Structures & Memory Pools](lite://handbook/data-structures-and-memory).
