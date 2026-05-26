import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  computeBalanceDelta,
  computeTransferDeltas,
} from "@/lib/firestore/helpers";

// --- computeBalanceDelta unit tests ---

describe("computeBalanceDelta", () => {
  it("expense returns negative amount (expense + 1000 → -1000)", () => {
    expect(computeBalanceDelta("expense", 1000)).toBe(-1000);
  });

  it("income returns positive amount (income + 1000 → 1000)", () => {
    expect(computeBalanceDelta("income", 1000)).toBe(1000);
  });

  it("expense with zero amount returns 0 (edge case)", () => {
    // `-0 + 0 === 0` — normalize sign since expense negates.
    expect(computeBalanceDelta("expense", 0) + 0).toBe(0);
  });

  it("income with zero amount returns 0 (edge case)", () => {
    expect(computeBalanceDelta("income", 0)).toBe(0);
  });
});

// --- computeTransferDeltas unit tests ---

describe("computeTransferDeltas", () => {
  it("no-op transfer (same accounts & same amount) yields empty deltas", () => {
    const old = { fromAccountId: "A", toAccountId: "B", amount: 1000 };
    const next = { fromAccountId: "A", toAccountId: "B", amount: 1000 };

    const { deltas } = computeTransferDeltas(old, next);

    expect(deltas.size).toBe(0);
  });

  it("four distinct accounts produce four merged delta entries", () => {
    const old = { fromAccountId: "A", toAccountId: "B", amount: 500 };
    const next = { fromAccountId: "C", toAccountId: "D", amount: 700 };

    const { deltas } = computeTransferDeltas(old, next);

    expect(deltas.size).toBe(4);
    // Old reversal: credit A by +500, debit B by -500
    expect(deltas.get("A")).toBe(500);
    expect(deltas.get("B")).toBe(-500);
    // New apply: debit C by -700, credit D by +700
    expect(deltas.get("C")).toBe(-700);
    expect(deltas.get("D")).toBe(700);
  });

  it("same fromAccount old & new with same amount strips fromAccount delta", () => {
    const old = { fromAccountId: "A", toAccountId: "B", amount: 1000 };
    const next = { fromAccountId: "A", toAccountId: "C", amount: 1000 };

    const { deltas } = computeTransferDeltas(old, next);

    // fromAccount A: +1000 (reverse old) + -1000 (apply new) = 0 → stripped
    expect(deltas.has("A")).toBe(false);
    // toAccount B was credited in old, so reversal debits it
    expect(deltas.get("B")).toBe(-1000);
    // new toAccount C is credited
    expect(deltas.get("C")).toBe(1000);
    expect(deltas.size).toBe(2);
  });

  it("same toAccount with different amounts merges into single net delta", () => {
    const old = { fromAccountId: "A", toAccountId: "B", amount: 800 };
    const next = { fromAccountId: "C", toAccountId: "B", amount: 300 };

    const { deltas } = computeTransferDeltas(old, next);

    // B: -800 (reverse old credit) + +300 (apply new credit) = -500
    expect(deltas.get("B")).toBe(-500);
    expect(deltas.get("A")).toBe(800);
    expect(deltas.get("C")).toBe(-300);
    expect(deltas.size).toBe(3);
  });
});

// --- Property test: sum of all deltas must always equal 0 ---

describe("computeTransferDeltas (property)", () => {
  /**
   * **Validates: Requirements AC12.3**
   *
   * For any old transfer and new transfer input, the sum of all returned
   * deltas SHALL equal 0. This is the transfer zero-sum invariant: a transfer
   * never creates or destroys money — the net change across all accounts must
   * cancel out, regardless of whether accounts collide or amounts differ.
   *
   * Stripping zero entries does not affect the sum (zeros contribute nothing),
   * so the invariant holds before and after the strip step.
   */
  it("sum of all deltas is always 0 across random transfers", () => {
    const accountIdArb = fc.constantFrom("A", "B", "C", "D", "E");
    const amountArb = fc.integer({ min: 0, max: 1_000_000_000 });

    const transferLegArb = fc.record({
      fromAccountId: accountIdArb,
      toAccountId: accountIdArb,
      amount: amountArb,
    });

    fc.assert(
      fc.property(transferLegArb, transferLegArb, (oldT, newT) => {
        const { deltas } = computeTransferDeltas(oldT, newT);

        let sum = 0;
        for (const d of deltas.values()) sum += d;
        expect(sum).toBe(0);

        // Sanity: stripped map should never contain a zero entry
        for (const d of deltas.values()) expect(d).not.toBe(0);
      }),
      { numRuns: 500 }
    );
  });
});
