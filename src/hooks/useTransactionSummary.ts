"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TxFilters } from "@/types";

export interface TransactionSummary {
  count: number;
  expenseTotal: number;
  incomeTotal: number;
}

const EMPTY_SUMMARY: TransactionSummary = {
  count: 0,
  expenseTotal: 0,
  incomeTotal: 0,
};

/**
 * Realtime count + expense/income totals for the given filters.
 * Unlike useTransactions this is not paginated, so `count` reflects the
 * whole month even when the visible list is still loading more pages.
 * Client-side filters (search) are intentionally ignored.
 */
export function useTransactionSummary(filters: TxFilters) {
  const [summary, setSummary] = useState<TransactionSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  const startMs = filters.startDate.getTime();
  const endMs = filters.endDate.getTime();
  const ownerFilter = filters.owner;
  const typeFilter = filters.type;
  const categoryIdFilter = filters.categoryId;
  const accountIdFilter = filters.accountId;

  useEffect(() => {
    setIsLoading(true);

    const constraints = [
      where("date", ">=", Timestamp.fromDate(filters.startDate)),
      where("date", "<=", Timestamp.fromDate(filters.endDate)),
    ];
    if (ownerFilter) constraints.push(where("owner", "==", ownerFilter));
    if (typeFilter) constraints.push(where("type", "==", typeFilter));
    if (categoryIdFilter)
      constraints.push(where("categoryId", "==", categoryIdFilter));
    if (accountIdFilter)
      constraints.push(where("accountId", "==", accountIdFilter));

    const q = query(collection(db, "transactions"), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let expenseTotal = 0;
        let incomeTotal = 0;
        snapshot.docs.forEach((doc) => {
          const tx = doc.data();
          if (tx.type === "income") {
            incomeTotal += tx.amount ?? 0;
          } else {
            expenseTotal += tx.amount ?? 0;
          }
        });
        setSummary({ count: snapshot.size, expenseTotal, incomeTotal });
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching transaction summary:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMs, endMs, ownerFilter, typeFilter, categoryIdFilter, accountIdFilter]);

  return { summary, isLoading };
}
