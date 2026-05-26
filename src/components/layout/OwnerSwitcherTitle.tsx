"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OwnerAvatar } from "@/components/shared/OwnerAvatar";
import { cn } from "@/lib/utils/cn";
import { OWNER_LABELS } from "@/lib/constants/labels";
import { Owner } from "@/types";

const ownerOptions: { key: Owner; href: string }[] = [
  { key: "arul", href: "/arul" },
  { key: "shared", href: "/together" },
  { key: "fifi", href: "/fifi" },
];

interface OwnerSwitcherTitleProps {
  activeOwner: Owner;
}

/**
 * Tap-to-switch title for owner pages (Arul / Fifi / Bareng).
 *
 * Replaces the static `<h1>` in `<Header />` when the page is owner-scoped.
 * Tapping shows a dropdown to jump between owner pages — alternative to the
 * BottomNav long-press gesture, which remains as a power-user shortcut.
 */
export const OwnerSwitcherTitle = ({ activeOwner }: OwnerSwitcherTitleProps) => {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 -ml-1 rounded-md px-1 py-0.5",
            "text-xl-header transition-colors",
            "hover:bg-accent active:bg-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          aria-label={`${OWNER_LABELS[activeOwner]} — ganti pemilik`}
        >
          <OwnerAvatar owner={activeOwner} size="sm" />
          <span>{OWNER_LABELS[activeOwner]}</span>
          <ChevronDown
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="min-w-[200px]">
        {ownerOptions.map((opt) => {
          const isCurrent = opt.key === activeOwner;
          return (
            <DropdownMenuItem
              key={opt.key}
              onSelect={() => {
                if (isCurrent) return;
                router.push(opt.href);
              }}
              className={cn("gap-3 py-2.5", isCurrent && "font-medium")}
            >
              <OwnerAvatar owner={opt.key} size="sm" />
              <span className="flex-1">{OWNER_LABELS[opt.key]}</span>
              {isCurrent && <Check className="h-4 w-4 opacity-70" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
