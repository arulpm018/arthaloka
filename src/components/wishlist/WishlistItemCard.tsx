"use client";

import { cn } from "@/lib/utils/cn";
import { isUrl, formatHarga } from "@/lib/utils/wishlist";
import { WishlistItem } from "@/types/wishlist";

interface WishlistItemCardProps {
  item: WishlistItem;
  onTogglePurchased: () => void;
  onTap: () => void;
}

export const WishlistItemCard = ({
  item,
  onTogglePurchased,
  onTap,
}: WishlistItemCardProps) => {
  return (
    <button
      onClick={onTap}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent rounded-lg"
    >
      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onTogglePurchased();
        }}
        className="flex items-center justify-center"
      >
        <input
          type="checkbox"
          checked={item.isPurchased}
          onChange={() => {}}
          className="h-5 w-5 rounded border-2 border-muted-foreground/50 accent-primary cursor-pointer"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            item.isPurchased && "line-through opacity-50"
          )}
        >
          {item.nama}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {formatHarga(item.harga)}
        </p>
        {item.lokasi && (
          <div className="mt-0.5">
            {isUrl(item.lokasi) ? (
              <a
                href={item.lokasi}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-primary underline truncate block"
              >
                {item.lokasi}
              </a>
            ) : (
              <p className="text-xs text-muted-foreground truncate">
                {item.lokasi}
              </p>
            )}
          </div>
        )}
      </div>
    </button>
  );
};
