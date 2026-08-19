"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { TxFilters } from "@/types";

interface TransactionFiltersProps {
  filters: Partial<TxFilters>;
  onChange: (filters: Partial<TxFilters>) => void;
}

export const TransactionFilters = ({
  filters,
  onChange,
}: TransactionFiltersProps) => {
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  // Track latest filters via ref to avoid re-running the propagate effect
  // every time the parent passes a new filters object identity. We only
  // want to fire onChange when the debounced search actually shifts.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Propagate debounced search up to parent.
  useEffect(() => {
    const next = debouncedSearch.trim() || undefined;
    if (next === filtersRef.current.search) return;
    onChangeRef.current({ ...filtersRef.current, search: next });
  }, [debouncedSearch]);

  // Sync local state if parent resets the filter externally (e.g., clear all).
  useEffect(() => {
    const incoming = filters.search ?? "";
    if (incoming !== searchValue && incoming !== debouncedSearch) {
      setSearchValue(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  return (
    <div className="space-y-2">
      <Input
        type="search"
        placeholder="Cari transaksi..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="h-9"
        aria-label="Cari transaksi"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-wrap">
        <Select
          value={filters.owner || "all"}
          onValueChange={(val) =>
            onChange({
              ...filters,
              owner:
                val === "all" ? undefined : (val as "arul" | "fifi" | "shared"),
            })
          }
        >
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Semua" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="arul">{OWNER_LABELS["arul"]}</SelectItem>
            <SelectItem value="fifi">{OWNER_LABELS["fifi"]}</SelectItem>
            <SelectItem value="shared">{OWNER_LABELS["shared"]}</SelectItem>
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

        <Select
          value={filters.categoryId || "all"}
          onValueChange={(val) =>
            onChange({
              ...filters,
              categoryId: val === "all" ? undefined : val,
            })
          }
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.categoryId} value={c.categoryId}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.accountId || "all"}
          onValueChange={(val) =>
            onChange({
              ...filters,
              accountId: val === "all" ? undefined : val,
            })
          }
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Akun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Akun</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.accountId} value={a.accountId}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
