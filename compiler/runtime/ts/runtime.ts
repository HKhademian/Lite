/** Checked runtime helpers for generated TypeScript artifacts. */

/** Smallest signed 64-bit value. */
export const INT_MIN = -(1n << 63n);

/** Largest signed 64-bit value. */
export const INT_MAX = (1n << 63n) - 1n;

/** One checked runtime failure from generated code. */
export class LiteRuntimeFault extends Error {
  readonly category: 'ArithmeticPanic' | 'BoundPanic' | 'InputFault';

  constructor(category: LiteRuntimeFault['category'], message: string) {
    super(message);
    this.name = category;
    this.category = category;
  }
}

/** Rejects one BigInt outside the signed 64-bit range. */
function checked(value: bigint): bigint {
  if (value < INT_MIN || value > INT_MAX) {
    throw new LiteRuntimeFault('ArithmeticPanic', 'integer expression outside signed 64-bit range');
  }
  return value;
}

/** Checked signed 64-bit addition. */
export function checkedAdd(left: bigint, right: bigint): bigint {
  return checked(left + right);
}

/** Checked signed 64-bit subtraction. */
export function checkedSubtract(left: bigint, right: bigint): bigint {
  return checked(left - right);
}

/** Checked signed 64-bit multiplication. */
export function checkedMultiply(left: bigint, right: bigint): bigint {
  return checked(left * right);
}

/** Checked truncating signed 64-bit division. */
export function checkedDivide(left: bigint, right: bigint): bigint {
  if (right === 0n) throw new LiteRuntimeFault('ArithmeticPanic', 'division by zero in integer expression');
  if (left === INT_MIN && right === -1n) {
    throw new LiteRuntimeFault('ArithmeticPanic', 'integer expression outside signed 64-bit range');
  }
  return left / right;
}

/** Checked truncating signed 64-bit remainder. */
export function checkedRemainder(left: bigint, right: bigint): bigint {
  if (right === 0n) throw new LiteRuntimeFault('ArithmeticPanic', 'remainder by zero in integer expression');
  if (left === INT_MIN && right === -1n) {
    throw new LiteRuntimeFault('ArithmeticPanic', 'integer expression outside signed 64-bit range');
  }
  return left % right;
}

/** Checked floor division. */
export function checkedFloorDivide(left: bigint, right: bigint): bigint {
  const quotient = checkedDivide(left, right);
  const remainder = left % right;
  return remainder !== 0n && (left < 0n) !== (right < 0n) ? quotient - 1n : quotient;
}

/** Checked floor modulo. */
export function checkedFloorModulo(left: bigint, right: bigint): bigint {
  if (right === 0n) throw new LiteRuntimeFault('ArithmeticPanic', 'modulo by zero in integer expression');
  const remainder = left % right;
  return remainder !== 0n && (remainder < 0n) !== (right < 0n) ? remainder + right : remainder;
}

/** Checked unary negation. */
export function checkedNegate(value: bigint): bigint {
  if (value === INT_MIN) {
    throw new LiteRuntimeFault('ArithmeticPanic', 'integer expression outside signed 64-bit range');
  }
  return -value;
}

/** Formats one checked Int as decimal text. */
export function intText(value: bigint): string {
  return value.toString(10);
}

/** Number of Unicode code points in one String. */
export function textLength(text: string): bigint {
  return BigInt(Array.from(text).length);
}

/** One code point at a checked position. */
export function textAt(text: string, position: bigint): string {
  const points = Array.from(text);
  const index = Number(position);
  if (index < 0 || index >= points.length) {
    throw new LiteRuntimeFault('BoundPanic', 'text index outside its extent');
  }
  const value = points[index];
  if (value === undefined) throw new LiteRuntimeFault('BoundPanic', 'text index outside its extent');
  return value;
}

/** Half-open code-point slice with checked bounds. */
export function textSlice(text: string, start: bigint, end: bigint): string {
  const points = Array.from(text);
  const first = Number(start);
  const last = Number(end);
  if (first < 0 || last < first || last > points.length) {
    throw new LiteRuntimeFault('BoundPanic', 'text slice outside its extent');
  }
  return points.slice(first, last).join('');
}

/** Copies one list value so later mutation cannot affect the source. */
export function listCopy<T>(items: readonly T[]): T[] {
  return items.slice();
}

/** Runs one generated program body and maps faults to the Lite exit contract. */
export function runMain(
  main: () => string,
  io: Readonly<{ report: (text: string) => void; reportError: (text: string) => void }>,
): number {
  try {
    io.report(main());
    return 0;
  } catch (error: unknown) {
    if (error instanceof LiteRuntimeFault) {
      io.reportError(`${error.category}: ${error.message}\n`);
      return 1;
    }
    io.reportError(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
