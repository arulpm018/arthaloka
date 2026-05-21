"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TxFilters } from "@/types";

interface TransactionFiltersProps {
  filters: Partial<TxFilters>;
  onChange: (filters: Partial<TxFilters>) => void;
}

export const TransactionFilters = ({
  filters,
  onChange,
}: TransactionFiltersProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <Select
        value={filters.owner || "all"}
        onValueChange={(val) =>
          onChange({
            ...filters,
            owner: val === "all" ? undefined : (val as "arul" | "fifi" | "shared"),
          })
        }
      >
        <SelectTrigger className="w-[100px] h-8 text-xs">
          <SelectValue placeholder="Semua" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua</SelectItem>
          <SelectItem value="arul">Arul</SelectItem>
          <SelectItem value="fifi">Fifi</SelectItem>
          <SelectItem value="shared">Together</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.type || "all"}
        onValueChange={(val) =>
          onChange({
            ...filters,
            type: val === "all" ? undefined : (val as "expense" | "income"),
          })
        }
      >
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue placeholder="Tipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua</SelectItem>
          <SelectItem value="expense">Pengeluaran</SelectItem>
          <SelectItem value="income">Pemasukan</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
