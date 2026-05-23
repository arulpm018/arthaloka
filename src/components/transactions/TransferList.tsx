"use client";

import { Transfer } from "@/types";
import { TransferItem } from "./TransferItem";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";

interface TransferListProps {
  transfers: Transfer[];
  onEdit: (transfer: Transfer) => void;
  onDelete: (transfer: Transfer) => void;
}

export const TransferList = ({
  transfers,
  onEdit,
  onDelete,
}: TransferListProps) => {
  // Group by date
  const grouped = transfers.reduce<Record<string, Transfer[]>>(
    (acc, tf) => {
      const date =
        tf.date instanceof Timestamp ? tf.date.toDate() : new Date(tf.date);
      const key = date.toDateString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(tf);
      return acc;
    },
    {}
  );

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => (
        <div key={dateKey} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 pt-3 pb-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {format(new Date(dateKey), "d MMMM", { locale: id })}
            </p>
          </div>
          <div className="divide-y divide-border">
            {grouped[dateKey].map((tf) => (
              <TransferItem
                key={tf.transferId}
                transfer={tf}
                onTap={() => onEdit(tf)}
                onDelete={() => onDelete(tf)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
