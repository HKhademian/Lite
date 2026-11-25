# Math, Vectors, Matrices & Grids

Lite provides pure, dual-target (TypeScript + C11) math, deterministic random generation, 2D/3D/4D vector algebra, 2×2/3×3/4×4 matrix transforms, and flat-backed 2D grids with identical numeric behavior across both backends.

## Core Math & Deterministic Randomness (`math/scalar`, `math/random`)

[math/scalar](lite://module/math/scalar) defines numeric constraint unions (`IntScalar`, `FloatScalar`, `Numeric`), generic scalar helpers (`abs`, `min`, `max`, `clamp`, `sign`), constants (`PI`, `TAU`, `HALF_PI`, `E`), `floor`/`ceil`/`round`/`trunc`/`fract`, trigonometry (`sin`, `cos`, `tan`, `atan`, `atan2`), `sqrt`, `gcd`, and `lcm`.

[math/random](lite://module/math/random) provides an immutable, seedable Lehmer PRNG (`Rng`) whose state advances explicitly without hidden global entropy (`Rng.create`, `.nextInt()`, `.rangeInt(...)`, `.nextBool()`):

```lite
io := import "core/io";
math := import "math/scalar";
rng := import "math/random";

var r := rng.Rng.create(42);
a := r.rangeInt(1, 7);
r = a.next;
b := r.rangeInt(1, 7);
io.outputLine(a.value, b.value, math.clamp(a.value + b.value, 2, 12));
```

## 2D, 3D & Generic N-D Vector Math (`math/vector`)

[math/vector](lite://module/math/vector) provides one unified generic constrained vector `Vec<T: Type<math.Numeric>, N: Int>` (`Vec2<T>`, `Vec3<T>`, `Vec4<T>`, `FVec2`, `FVec3`, `FVec4`, `IVec2`, `IVec3`) with static constructors inherited by all aliases (`Vec.from`, `Vec.splat`, `Vec.zeroed`, e.g. `IVec2.zeroed()`, `Vec2.splat(1.0)`), positional `vec2`/`vec3`/`vec4`, `ZERO2`–`ZERO4`, `UNIT_X3`–`UNIT_Z3`, `x()`/`y()`/`z()`/`w()`, `setX`/`setY`/`setZ`/`setW`, `dot`, `length`, `normalize`, `lerp`, `cross`, `cross2`, `rotate`, `reflect`:

```lite
io := import "core/io";
vec := import "math/vector";

a := vec.vec2(3.0, 4.0);
b := vec.FVec2.splat(1.0);
sum := a.add(b);
io.outputLine(a.length(), a.dot(b), sum.x(), sum.y());
```

## N×M, 2×2, 3×3 & 4×4 Matrix Transforms (`math/matrix`)

[math/matrix](lite://module/math/matrix) defines one unified generic row-major matrix record `Mat<T: Type<math.Numeric>, R: Int, C: Int>` backed by `[Vec<T, C>; R]` (`Mat2<T>`, `Mat3<T>`, `Mat4<T>`, `FMat2`, `FMat3`, `FMat4`), with static type constructors (`Mat.from`, `Mat.zeroed`, `Mat.identity`, `FMat2.rotation2`, `FMat3.translate2`/`scale2`/`rotate2`, `FMat4.translate3`/`scale3`/`rotateX`/`rotateY`/`rotateZ`/`perspective`) and `.mul()`, `.mulVec()`, `.transpose()`, `.det()`, `.transformPoint2()`, `.transformPoint3()`:

```lite
io := import "core/io";
vec := import "math/vector";
mat := import "math/matrix";

move := mat.FMat3.translate2(10.0, 20.0);
scale := mat.FMat3.scale2(2.0, 3.0);
xform := move.mul(scale);
pt := xform.transformPoint2(vec.vec2(4.0, 5.0));
io.outputLine(pt.x(), pt.y(), xform.det());
```

## Flat-Backed 2D Grids (`ds/grid`)

[ds/grid](lite://module/ds/grid) stores dense 2D `Grid<T>` (`IntGrid` and `FloatGrid`) tilemaps, heightfields, and cellular automata in contiguous flat storage with bounds-checked reads/writes (`inBounds`, `getOr`, `set`), rectangle fills (`fillRect`), value counting (`countValue`), and bulk copies (`copyFrom`):

```lite
io := import "core/io";
grid := import "ds/grid";

mut g := grid.IntGrid.create(6, 4, 0);
mut g.fillRect(1, 1, 3, 2, 1);
io.outputLine(g.getOr(2, 2, -1), g.countValue(1));
```

Explore the module references: [math/scalar](lite://module/math/scalar), [math/random](lite://module/math/random), [math/vector](lite://module/math/vector), [math/matrix](lite://module/math/matrix), [math/geom](lite://module/math/geom), and [ds/grid](lite://module/ds/grid).

## Geometry Primitives (`math/geom`)

[math/geom](lite://module/math/geom) builds on `math/scalar` and `math/vector` with generic N-dimensional `Box<T, N>`, `Ray<T, N>`, `Segment<T, N>`, and `Ball<T, N>` (aliasing `Circle = Ball<Float, 2>` and `Sphere = Ball<Float, 3>` alongside concrete `Rect`), static constructors (`Box.fromMinMax`, `Ray.create`, `Segment.create`, `Rect.create`, `Ball.create`/`Circle.create`/`Sphere.create`), payload-bearing `RayHit` (`Miss` / `Hit(Float)`), and intersection queries (`r.hitBox(...)`, `r.hitBall(...)`, `containsPoint`, `intersects`).

## Next Chapter

Continue to [Data Structures & Memory Pools](lite://handbook/data-structures-and-memory).
