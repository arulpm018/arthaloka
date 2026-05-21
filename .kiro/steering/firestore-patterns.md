---
inclusion: fileMatch
fileMatchPattern: "src/lib/firestore/**,src/hooks/**"
---

# Firestore Patterns — Arthaloka

## Service Function Pattern
Semua Firestore operations di `src/lib/firestore/`. Jangan akses Firestore langsung dari components.

```typescript
// src/lib/firestore/transactions.ts
import {
  collection, doc, query, where, orderBy, limit,
  addDoc, updateDoc, deleteDoc, writeBatch, increment,
  Timestamp, serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const transactionsService = {
  // CREATE — selalu pakai batch write untuk update balance
  create: async (input: CreateTransactionInput) => {
    const batch = writeBatch(db);

    const txRef = doc(collection(db, "transactions"));
    const accountRef = doc(db, "accounts", input.accountId);

    const delta = input.type === "expense" ? -input.amount : input.amount;

    batch.set(txRef, {
      ...input,
      transactionId: txRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(accountRef, {
      balance: increment(delta),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    return txRef.id;
  },

  // DELETE — reverse balance effect
  delete: async (tx: Transaction) => {
    const batch = writeBatch(db);

    const txRef = doc(db, "transactions", tx.transactionId);
    const accountRef = doc(db, "accounts", tx.accountId);

    const reverseDelta = tx.type === "expense" ? tx.amount : -tx.amount;

    batch.delete(txRef);
    batch.update(accountRef, {
      balance: increment(reverseDelta),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  },
};
```

## Hook Pattern (Realtime Listener)
```typescript
// src/hooks/useTransactions.ts
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transaction } from "@/types/transaction";

export const useTransactions = (filters: TxFilters) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);

    const q = query(
      collection(db, "transactions"),
      where("date", ">=", filters.startDate),
      where("date", "<=", filters.endDate),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data() } as Transaction));
        setTransactions(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe(); // cleanup on unmount
  }, [filters.startDate, filters.endDate]);

  return { transactions, isLoading, error };
};
```

## Critical Rules
1. **SELALU batch write** saat create/edit/delete transaction atau transfer (balance harus atomic)
2. **SELALU unsubscribe** listener di useEffect cleanup
3. **SELALU gunakan serverTimestamp()** untuk createdAt/updatedAt
4. **JANGAN** simpan amount sebagai float — selalu integer (IDR tanpa koma)
5. **JANGAN** query tanpa limit — selalu paginate (max 20-50 per query)
6. **DENORMALIZE** accountName dan categoryName di transaction (hemat reads)
