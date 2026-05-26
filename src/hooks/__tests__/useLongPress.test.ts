import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { shouldCancelLongPress } from "@/hooks/useLongPress";

// ─── Unit tests for shouldCancelLongPress ────────────────────────────────────

describe("shouldCancelLongPress — unit cases", () => {
  it("returns false when current position equals start (dx=0, dy=0)", () => {
    const start = { x: 100, y: 100 };
    const current = { x: 100, y: 100 };
    expect(shouldCancelLongPress(start, current, 10)).toBe(false);
  });

  it("returns false when distance is below threshold (5px move, threshold 10)", () => {
    const start = { x: 0, y: 0 };
    const current = { x: 5, y: 0 };
    // hypot(5, 0) = 5, not > 10
    expect(shouldCancelLongPress(start, current, 10)).toBe(false);
  });

  it("returns true when distance exceeds threshold (15px move, threshold 10)", () => {
    const start = { x: 0, y: 0 };
    const current = { x: 15, y: 0 };
    // hypot(15, 0) = 15, > 10
    expect(shouldCancelLongPress(start, current, 10)).toBe(true);
  });

  it("returns true for diagonal movement where hypot exceeds threshold (8x + 8y ≈ 11.31, threshold 10)", () => {
    const start = { x: 0, y: 0 };
    const current = { x: 8, y: 8 };
    // hypot(8, 8) = sqrt(128) ≈ 11.314 > 10
    expect(shouldCancelLongPress(start, current, 10)).toBe(true);
  });

  it("returns false at the exact threshold boundary (strictly greater, not >=)", () => {
    const start = { x: 0, y: 0 };
    const current = { x: 10, y: 0 };
    // hypot(10, 0) = 10, not strictly > 10
    expect(shouldCancelLongPress(start, current, 10)).toBe(false);
  });

  it("handles negative coordinate deltas correctly (-15px is still 15px distance)", () => {
    const start = { x: 100, y: 100 };
    const current = { x: 85, y: 100 };
    // hypot(-15, 0) = 15 > 10
    expect(shouldCancelLongPress(start, current, 10)).toBe(true);
  });
});

// ─── Property tests for shouldCancelLongPress ────────────────────────────────

describe("shouldCancelLongPress — property tests", () => {
  // Reasonable bounds for screen coordinates and thresholds (px). Intentionally
  // wide enough to catch edge cases but not so large that hypot overflows.
  const coordArb = fc.integer({ min: -10_000, max: 10_000 });
  const positionArb = fc.record({ x: coordArb, y: coordArb });
  const thresholdArb = fc.integer({ min: 0, max: 500 });

  /**
   * **Validates: Requirements 12.5**
   *
   * For any start/current positions and any threshold, the function returns
   * true if and only if the Euclidean distance (Math.hypot of dx, dy) exceeds
   * the threshold strictly. Equivalent to the `Math.hypot(dx, dy) > threshold`
   * predicate.
   */
  it("returns true iff Math.hypot(dx, dy) > threshold", () => {
    fc.assert(
      fc.property(positionArb, positionArb, thresholdArb, (start, current, threshold) => {
        const dx = current.x - start.x;
        const dy = current.y - start.y;
        const expected = Math.hypot(dx, dy) > threshold;
        expect(shouldCancelLongPress(start, current, threshold)).toBe(expected);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 12.5**
   *
   * Identity property: when current == start (no movement), the function must
   * return false for any non-negative threshold, since hypot(0, 0) = 0 which
   * is never strictly greater than a non-negative threshold.
   */
  it("returns false for identity move (start === current) with non-negative threshold", () => {
    fc.assert(
      fc.property(positionArb, thresholdArb, (pos, threshold) => {
        expect(shouldCancelLongPress(pos, pos, threshold)).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 12.5**
   *
   * Symmetry property: swapping `start` and `current` must yield the same
   * result, because Euclidean distance is symmetric (hypot uses squared
   * deltas, so sign of dx/dy doesn't matter).
   */
  it("is symmetric in start and current arguments", () => {
    fc.assert(
      fc.property(positionArb, positionArb, thresholdArb, (a, b, threshold) => {
        expect(shouldCancelLongPress(a, b, threshold)).toBe(
          shouldCancelLongPress(b, a, threshold)
        );
      }),
      { numRuns: 300 }
    );
  });
});
