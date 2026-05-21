"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transaction } from "@/types";
import { startOfMonth, endOfMonth } from "date-fns";

export function useSummary(month: Date, owner?: string) {
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const constraints = [
      where("date", ">=", Timestamp.fromDate(startOfMonth(month))),
      where("date", "<=", Timestamp.fromDate(endOfMonth(month))),
      orderBy("date", "desc"),
    ];
    if (owner) constraints.push(where("owner", "==", owner));

    const q = query(collection(db, "transactions"), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let inc = 0;
        let exp = 0;
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Transaction;
          if (data.type === "income") inc += data.amount;
          else exp += data.amount;
        });
        setIncome(inc);
        setExpense(exp);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching summary:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [month, owner]);

  return { income, expense, net: income - expense, isLoading };
}
