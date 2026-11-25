# Math, Vectors, Matrices & Grids

Lite provides pure, dual-target (TypeScript + C11) math, deterministic random generation, 2D/3D/4D vector algebra, 2×2/3×3/4×4 matrix transforms, and flat-backed 2D grids with identical numeric behavior across both backends.

## Core Math & Deterministic Randomness (`math/scalar`, `math/random`)

[math/scalar](lite://module/math/scalar) defines `PI`, `TAU`, `E`, `absInt`/`absFloat`, `minInt`/`maxInt`, `clampInt`/`clampFloat`, `floor`/`ceil`/`round`, `sqrt`, and `signInt`/`signFloat`.

[math/random](lite://module/math/random) provides an immutable, seedable Lehmer PRNG (`Rng`) whose state advances explicitly without hidden global entropy:

```lite
io := import "core/io";
math := import "math/scalar";
rng := import "math/random";

var r := rng.create(42);
a := rng.rangeInt(r, 1, 7);
r = a.next;
b := rng.rangeInt(r, 1, 7);
io.outputLine(a.value, b.value, math.clampInt(a.value + b.value, 2, 12));
```

## 2D, 3D & 4D Vector Math (`math/vector`)

[math/vector](lite://module/math/vector) provides value-typed `Vec2`, `Vec3`, and `Vec4` records with constants (`ZERO2`, `ZERO3`, `UNIT_X3`, `UNIT_Y3`, `UNIT_Z3`), range-reduced trigonometry (`sinRad`, `cosRad`), arithmetic (`add`, `sub`, `scale`, `dot`, `cross`), normalization, distance, reflection, and linear interpolation (`lerp`):

```lite
io := import "core/io";
vec := import "math/vector";

a := vec.vec2(3.0, 4.0);
b := vec.vec2(1.0, 0.0);
sum := a.add(b);
io.outputLine(a.length(), a.dot(b), sum.x, sum.y);
```

## 2×2, 3×3 & 4×4 Matrix Transforms (`math/matrix`)

[math/matrix](lite://module/math/matrix) builds on `math/vector` with `Mat2`, `Mat3`, and `Mat4` value types for 2D affine transforms (`translate2`, `scale2`, `rotate2`, `transformPoint2`) and 3D pipelines (`translate3`, `scale3`, `rotateX`, `rotateY`, `rotateZ`, `mul4`, `transpose4`, `det3`, `perspective`, `lookAt`):

```lite
io := import "core/io";
vec := import "math/vector";
mat := import "math/matrix";

move := mat.translate2(10.0, 20.0);
scale := mat.scale2(2.0, 3.0);
xform := mat.mul3(move, scale);
pt := mat.transformPoint2(xform, vec.vec2(4.0, 5.0));
io.outputLine(pt.x, pt.y);
```

## Flat-Backed 2D Grids (`ds/grid`)

[ds/grid](lite://module/ds/grid) stores dense 2D integer (`IntGrid`) and floating-point (`FloatGrid`) tilemaps, heightfields, and cellular automata in contiguous flat storage with bounds-checked reads/writes (`inIntBounds`, `getIntOr`, `setInt`), rectangle fills (`fillIntRect`), value counting (`countIntValue`), and bulk copies (`copyInts`):

```lite
io := import "core/io";
grid := import "ds/grid";

g := grid.createInts(6, 4, 0);
grid.fillIntRect(g, 1, 1, 3, 2, 1);
io.outputLine(grid.getIntOr(g, 2, 2, -1), grid.countIntValue(g, 1));
grid.destroyInts(g);
```

Explore the module references: [math/scalar](lite://module/math/scalar), [math/random](lite://module/math/random), [math/vector](lite://module/math/vector), [math/matrix](lite://module/math/matrix), and [ds/grid](lite://module/ds/grid).

## Next Chapter

Continue to [Data Structures & Memory Pools](lite://handbook/data-structures-and-memory).
