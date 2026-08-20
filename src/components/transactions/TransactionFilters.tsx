"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { TxFilters } from "@/types";

interface TransactionFiltersProps {
  filters: Partial<TxFilters>;
  onChange: (filters: Partial<TxFilters>) => void;
}

type FacetValue = string | undefined;

interface FacetChipProps {
  label: string;
  value: FacetValue;
  valueLabel: string | null;
  options: { value: string; label: string }[];
  onChange: (value: FacetValue) => void;
}

/**
 * Chip filter satu-pilih: bagian label membuka dropdown untuk memilih,
 * tombol x (muncul saat ada nilai) menghapus filter tanpa buka dropdown.
 * Melebar penuh mengikuti kolom grid-nya.
 */
const FacetChip = ({
  label,
  value,
  valueLabel,
  options,
  onChange,
}: FacetChipProps) => {
  const active = !!value && !!valueLabel;

  return (
    <div
      className={`flex h-8 w-full min-w-0 items-center rounded-full border text-xs font-medium transition-colors ${
        active
          ? "border-primary/40 bg-primary/5 text-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`group flex h-full min-w-0 flex-1 items-center justify-center gap-1 text-xs font-medium outline-none ${
            active ? "rounded-l-full pl-2.5 pr-1" : "rounded-full px-2.5"
          }`}
          aria-label={`Filter ${label}`}
        >
          <span className="min-w-0 truncate">
            {active ? valueLabel : label}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuRadioGroup
            value={value ?? "all"}
            onValueChange={(val) => onChange(val === "all" ? undefined : val)}
          >
            <DropdownMenuRadioItem value="all">Semua</DropdownMenuRadioItem>
            {options.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {active && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label={`Hapus filter ${label}`}
          className="flex h-full w-7 shrink-0 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

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

  const typeOptions: { value: FacetValue; label: string }[] = [
    { value: undefined, label: "Semua" },
    { value: "expense", label: "Pengeluaran" },
    { value: "income", label: "Pemasukan" },
  ];

  const activeCount = [
    filters.owner,
    filters.type,
    filters.categoryId,
    filters.accountId,
  ].filter(Boolean).length;

  const setFacet = (key: keyof TxFilters, value: FacetValue) => {
    onChangeRef.current({ ...filtersRef.current, [key]: value });
  };

  const clearAll = () => {
    onChangeRef.current({});
  };

  const categoryName =
    categories.find((c) => c.categoryId === filters.categoryId)?.name ?? null;
  const accountName =
    accounts.find((a) => a.accountId === filters.accountId)?.name ?? null;

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

      {/* Tipe: hanya 2 opsi, segmented full-width biar gak perlu scroll */}
      <div className="flex h-8 rounded-full border border-border bg-muted p-0.5">
        {typeOptions.map((opt) => {
          const isActive = (filters.type ?? undefined) === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => setFacet("type", opt.value)}
              aria-pressed={isActive}
              className={`flex-1 rounded-full px-2 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <FacetChip
          label="Pemilik"
          value={filters.owner}
          valueLabel={filters.owner ? OWNER_LABELS[filters.owner] : null}
          options={(["arul", "fifi", "shared"] as const).map((o) => ({
            value: o,
            label: OWNER_LABELS[o],
          }))}
          onChange={(val) => setFacet("owner", val as TxFilters["owner"])}
        />

        <FacetChip
          label="Kategori"
          value={filters.categoryId}
          valueLabel={categoryName}
          options={categories.map((c) => ({
            value: c.categoryId,
            label: c.name,
          }))}
          onChange={(val) => setFacet("categoryId", val)}
        />

        <FacetChip
          label="Akun"
          value={filters.accountId}
          valueLabel={accountName}
          options={accounts.map((a) => ({
            value: a.accountId,
            label: a.name,
          }))}
          onChange={(val) => setFacet("accountId", val)}
        />
      </div>

      {activeCount >= 2 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Hapus semua
          </button>
        </div>
      )}
    </div>
  );
};
