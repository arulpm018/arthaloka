"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Account, CreateAccountInput, Owner } from "@/types";
import { accountsService } from "@/lib/firestore/accounts";

export function useAccounts(owner?: Owner) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const accountsRef = collection(db, "accounts");

    let q;
    if (owner) {
      q = query(
        accountsRef,
        where("isActive", "==", true),
        where("owner", "==", owner),
        orderBy("order", "asc")
      );
    } else {
      q = query(
        accountsRef,
        where("isActive", "==", true),
        orderBy("order", "asc")
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          accountId: doc.id,
        })) as Account[];
        setAccounts(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching accounts:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [owner]);

  const create = async (input: CreateAccountInput): Promise<string> => {
    return accountsService.create(input);
  };

  const update = async (id: string, data: Partial<Account>): Promise<void> => {
    return accountsService.update(id, data);
  };

  const deactivate = async (id: string): Promise<void> => {
    return accountsService.deactivate(id);
  };

  const reorder = async (orderedIds: string[]): Promise<void> => {
    return accountsService.reorder(orderedIds);
  };

  return {
    accounts,
    isLoading,
    create,
    update,
    deactivate,
    reorder,
  };
}
