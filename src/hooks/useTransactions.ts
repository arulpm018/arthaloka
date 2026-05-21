"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transaction, TxFilters } from "@/types";
import { transactionsService } from "@/lib/firestore/transactions";

const PAGE_SIZE = 20;

export function useTransactions(filters: TxFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const constraints: QueryConstraint[] = [
      where("date", ">=", Timestamp.fromDate(filters.startDate)),
      where("date", "<=", Timestamp.fromDate(filters.endDate)),
      orderBy("date", "desc"),
      limit(PAGE_SIZE),
    ];

    if (filters.owner) constraints.push(where("owner", "==", filters.owner));
    if (filters.type) constraints.push(where("type", "==", filters.type));
    if (filters.categoryId)
      constraints.push(where("categoryId", "==", filters.categoryId));

    const q = query(collection(db, "transactions"), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          transactionId: doc.id,
        })) as Transaction[];
        setTransactions(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching transactions:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [
    filters.startDate,
    filters.endDate,
    filters.owner,
    filters.type,
    filters.categoryId,
  ]);

  const remove = async (tx: Transaction) => {
    await transactionsService.delete(tx);
  };

  return { transactions, isLoading, remove };
}
