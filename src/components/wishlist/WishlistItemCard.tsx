"use client";

import { cn } from "@/lib/utils/cn";
import { isUrl, formatHarga } from "@/lib/utils/wishlist";
import { WishlistItem } from "@/types/wishlist";
import { ExternalLink, MapPin } from "lucide-react";

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
    <div
      onClick={onTap}
      className={cn(
        "flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
        "hover:bg-accent/50 active:bg-accent",
        item.isPurchased && "opacity-60"
      )}
    >
      {/* Custom checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePurchased();
        }}
        className="mt-0.5 flex-shrink-0"
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
};
