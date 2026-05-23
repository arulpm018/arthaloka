"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transfer, TransferFilters, Owner } from "@/types";
import { transfersService } from "@/lib/firestore/transfers";
import { useAccounts } from "./useAccounts";

export function useTransfers(filters: TransferFilters) {
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accounts } = useAccounts();

  const startMs = filters.startDate.getTime();
  const endMs = filters.endDate.getTime();
  const owner = filters.owner;

  useEffect(() => {
    const q = query(
      collection(db, "transfers"),
      where("date", ">=", Timestamp.fromMillis(startMs)),
      where("date", "<=", Timestamp.fromMillis(endMs)),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          transferId: doc.id,
        })) as Transfer[];
        setAllTransfers(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching transfers:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [startMs, endMs]);

  // Map accountId → owner for resolving owner of legacy transfers
  const accountOwnerMap = useMemo(() => {
    const map = new Map<string, Owner>();
    accounts.forEach((a) => map.set(a.accountId, a.owner));
    return map;
  }, [accounts]);

  const transfers = useMemo(() => {
    if (!owner) return allTransfers;
    return allTransfers.filter((t) => {
      const fromOwner = t.fromAccountOwner ?? accountOwnerMap.get(t.fromAccountId);
      const toOwner = t.toAccountOwner ?? accountOwnerMap.get(t.toAccountId);
      return fromOwner === owner || toOwner === owner;
    });
  }, [allTransfers, owner, accountOwnerMap]);

  const remove = async (transfer: Transfer) => {
    await transfersService.delete(transfer);
  };

  return { transfers, isLoading, remove };
}
