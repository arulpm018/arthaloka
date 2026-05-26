import { Transfer, CreateTransferInput } from "@/types";

/**
 * Compute the signed balance delta to apply to an account given a
 * transaction type and amount.
 *
 * - expense → negative delta (account balance decreases)
 * - income  → positive delta (account balance increases)
 *
 * Pure function. Extracted from `transactionsService` for testability.
 *
 * Validates: AC12.4 (balance delta sign correctness invariant).
 */
export function computeBalanceDelta(
  type: "expense" | "income",
  amount: number,
): number {
  return type === "expense" ? -amount : amount;
}

export interface ComputedTransferDeltas {
  /** Net delta per accountId. Zero deltas are stripped. */
  deltas: Map<string, number>;
}

/**
 * Compute net balance deltas per account when a transfer is updated.
 *
 * Reverses the old transfer (credit back the old `from`, debit the old `to`)
 * and applies the new transfer (debit the new `from`, credit the new `to`).
 * Net deltas are merged per accountId so that a Firestore batch never issues
 * multiple updates to the same document. Zero-net entries are stripped.
 *
 * Pure function. Extracted from `transfersService.update` for testability.
 *
 * Validates: AC12.3 (transfer zero-sum invariant — sum of all deltas = 0).
 */
export function computeTransferDeltas(
  oldTransfer: Pick<Transfer, "fromAccountId" | "toAccountId" | "amount">,
  newInput: Pick<CreateTransferInput, "fromAccountId" | "toAccountId" | "amount">,
): ComputedTransferDeltas {
  const deltas = new Map<string, number>();
  const add = (id: string, d: number) => {
    deltas.set(id, (deltas.get(id) ?? 0) + d);
  };

  // Reverse old: credit back fromAccount, debit toAccount
  add(oldTransfer.fromAccountId, oldTransfer.amount);
  add(oldTransfer.toAccountId, -oldTransfer.amount);

  // Apply new: debit fromAccount, credit toAccount
  add(newInput.fromAccountId, -newInput.amount);
  add(newInput.toAccountId, newInput.amount);

  for (const [id, d] of Array.from(deltas)) {
    if (d === 0) deltas.delete(id);
  }

  return { deltas };
}
