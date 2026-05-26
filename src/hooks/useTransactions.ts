"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  startAfter,
  Timestamp,
  QueryConstraint,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transaction, TxFilters } from "@/types";
import { transactionsService } from "@/lib/firestore/transactions";

const PAGE_SIZE = 20;

function buildBaseConstraints(filters: TxFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [
    where("date", ">=", Timestamp.fromDate(filters.startDate)),
    where("date", "<=", Timestamp.fromDate(filters.endDate)),
  ];

  if (filters.owner) constraints.push(where("owner", "==", filters.owner));
  if (filters.type) constraints.push(where("type", "==", filters.type));
  if (filters.categoryId)
    constraints.push(where("categoryId", "==", filters.categoryId));
  if (filters.accountId)
    constraints.push(where("accountId", "==", filters.accountId));

  constraints.push(orderBy("date", "desc"));
  return constraints;
}

export function useTransactions(filters: TxFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Track latest filters in a ref so loadMore can read current filter values
  // without re-creating the callback on every render.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Depend on primitive timestamps (and primitive filter fields) instead of
  // the Date objects directly. Call sites typically pass `new Date(...)` each
  // render, so depending on the Date reference would cause infinite re-runs.
  const startMs = filters.startDate.getTime();
  const endMs = filters.endDate.getTime();
  const ownerFilter = filters.owner;
  const typeFilter = filters.type;
  const categoryIdFilter = filters.categoryId;
  const accountIdFilter = filters.accountId;

  useEffect(() => {
    // Reset cursor + pagination state whenever filters change.
    setIsLoading(true);
    setTransactions([]);
    setLastDoc(null);
    setHasMore(false);

    const baseConstraints = buildBaseConstraints(filtersRef.current);
    const q = query(
      collection(db, "transactions"),
      ...baseConstraints,
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          transactionId: doc.id,
        })) as Transaction[];
        setTransactions(data);
        setLastDoc(
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1]
            : null
        );
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching transactions:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [
    startMs,
    endMs,
    ownerFilter,
    typeFilter,
    categoryIdFilter,
    accountIdFilter,
  ]);

  const loadMore = useCallback(async () => {
    if (!lastDoc || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const baseConstraints = buildBaseConstraints(filtersRef.current);
      const nextQuery = query(
        collection(db, "transactions"),
        ...baseConstraints,
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(nextQuery);
      const newDocs = snapshot.docs.map((doc) => ({
        ...doc.data(),
        transactionId: doc.id,
      })) as Transaction[];

      setTransactions((prev) => {
        // Dedupe by transactionId in case onSnapshot ke-stream sudah include doc
        // yang sama (defensive — typically tidak overlap).
        const existing = new Set(prev.map((t) => t.transactionId));
        const merged = [...prev];
        for (const tx of newDocs) {
          if (!existing.has(tx.transactionId)) merged.push(tx);
        }
        return merged;
      });

      setLastDoc(
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1]
          : lastDoc
      );
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error loading more transactions:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [lastDoc, hasMore, isLoadingMore]);

  const remove = async (tx: Transaction) => {
    await transactionsService.delete(tx);
  };

  return { transactions, isLoading, hasMore, loadMore, remove };
}
