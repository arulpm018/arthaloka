"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { isUrl, formatHarga } from "@/lib/utils/wishlist";
import { WishlistItem } from "@/types/wishlist";
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  Pencil,
  Receipt,
  Trash2,
} from "lucide-react";
import { useLongPress } from "@/hooks/useLongPress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WishlistItemCardProps {
  item: WishlistItem;
  onTogglePurchased: () => void;
  onTap: () => void;
  /** Optional — wired by `onLongPress` menu (Edit). Defaults to `onTap` if absent. */
  onEdit?: () => void;
  /** Optional — wired by `onLongPress` menu (Hapus). When absent, no menu is shown. */
  onDelete?: () => void;
  /**
   * Optional — when provided AND item is not yet purchased, the checkbox tap
   * shows a small dropdown with two options: simple toggle vs. toggle + record
   * the purchase as an expense transaction. Wired by parent that owns the
   * TransactionSheet pre-fill flow.
   */
  onMarkPurchasedWithExpense?: () => void;
}

export const WishlistItemCard = ({
  item,
  onTogglePurchased,
  onTap,
  onEdit,
  onDelete,
  onMarkPurchasedWithExpense,
}: WishlistItemCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [purchaseMenuOpen, setPurchaseMenuOpen] = useState(false);

  // Menu is only useful when at least one action is provided. When neither is
  // wired, we fall back to a plain clickable card (existing behaviour).
  const hasMenu = !!onEdit || !!onDelete;

  // Show the purchase-options dropdown only when item is not yet purchased AND
  // the parent wired the expense-recording flow. When already purchased, the
  // checkbox is a simple un-purchase toggle.
  const showPurchaseOptions = !item.isPurchased && !!onMarkPurchasedWithExpense;

  const handlers = useLongPress({
    onLongPress: () => {
      if (hasMenu) setMenuOpen(true);
    },
    onTap,
  });

  const { onPointerDown, ...restHandlers } = handlers;

  // Wrap pointer down to suppress Radix DropdownMenuTrigger's default tap-to-open
  // behaviour. Without this, a normal tap on the card would also open the menu.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (hasMenu) e.preventDefault();
    onPointerDown(e);
  };

  // Stop pointer events from bubbling on inner interactive elements so the
  // outer long-press / tap detection does not fire when the user is clicking
  // the checkbox or the lokasi link.
  const stopInner = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  // Radix renders DropdownMenuContent inside a Portal, but React events still
  // bubble through the component tree. Without this, a tap on a menu item
  // would bubble back up to the card's `useLongPress` handlers and fire
  // `onTap` (= edit form), in addition to running the menu's `onSelect`.
  // Stopping pointer + click propagation on the content boundary keeps the
  // gesture detection isolated.
  const stopMenuEvents = {
    onPointerDown: stopInner,
    onPointerUp: stopInner,
    onPointerMove: stopInner,
    onClick: stopInner,
  };

  // Checkbox button. When wrapped in the inner DropdownMenuTrigger (via
  // `showPurchaseOptions`), Radix handles opening the menu on click — we only
  // need to stop propagation so the outer long-press card never sees the tap.
  // Otherwise the click is a direct toggle (purchase ↔ un-purchase).
  const checkboxButton = (
    <button
      type="button"
      onPointerDown={stopInner}
      onPointerUp={stopInner}
      onClick={(e) => {
        e.stopPropagation();
        if (!showPurchaseOptions) {
          onTogglePurchased();
        }
      }}
      className="mt-0.5 flex-shrink-0"
      aria-label={
        item.isPurchased ? "Tandai belum dibeli" : "Tandai sudah dibeli"
      }
    >
      <div
        className={cn(
          "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
          item.isPurchased
            ? "bg-primary border-primary"
            : "border-muted-foreground/40 hover:border-primary/60"
        )}
      >
        {item.isPurchased && (
          <svg
            className="h-3 w-3 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
    </button>
  );

  const checkbox = showPurchaseOptions ? (
    <DropdownMenu open={purchaseMenuOpen} onOpenChange={setPurchaseMenuOpen}>
      <DropdownMenuTrigger asChild>{checkboxButton}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        className="w-64"
        {...stopMenuEvents}
      >
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setPurchaseMenuOpen(false);
            onTogglePurchased();
          }}
        >
          <CheckCircle2 className="h-4 w-4" />
          Tandai sudah dibeli
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setPurchaseMenuOpen(false);
            onMarkPurchasedWithExpense?.();
          }}
        >
          <Receipt className="h-4 w-4" />
          Tandai dibeli + catat pengeluaran
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    checkboxButton
  );

  const card = (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      {...restHandlers}
      className={cn(
        "flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors select-none",
        "hover:bg-accent/50 active:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        item.isPurchased && "opacity-60"
      )}
    >
      {/* Custom checkbox (with optional purchase-options dropdown) */}
      {checkbox}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-tight",
            item.isPurchased
              ? "line-through text-muted-foreground"
              : "font-medium"
          )}
        >
          {item.nama}
        </p>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {formatHarga(item.harga)}
          </span>

          {item.lokasi && (
            <>
              <span className="text-muted-foreground/30">·</span>
              {isUrl(item.lokasi) ? (
                <a
                  href={item.lokasi}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerDown={stopInner}
                  onPointerUp={stopInner}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">
                    {item.lokasi.replace(/^https?:\/\//, "").split("/")[0]}
                  </span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{item.lokasi}</span>
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (!hasMenu) return card;

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>{card}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" {...stopMenuEvents}>
        {onEdit && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              onDelete();
            }}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
