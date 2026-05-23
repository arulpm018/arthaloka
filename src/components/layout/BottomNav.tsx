"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  User,
  Users,
  Heart,
  Sparkles,
  Receipt,
  MoreHorizontal,
  ChevronUp,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/store/useAppStore";

type OwnerKey = "arul" | "fifi" | "together";

const ownerOptions: {
  key: OwnerKey;
  href: string;
  label: string;
  icon: typeof User;
}[] = [
  { key: "arul", href: "/arul", label: "Arul", icon: User },
  { key: "together", href: "/together", label: "Together", icon: Users },
  { key: "fifi", href: "/fifi", label: "Fifi", icon: Heart },
];

const ownerByPath: Record<string, OwnerKey> = {
  "/arul": "arul",
  "/fifi": "fifi",
  "/together": "together",
};

const moreRoutes = ["/more", "/accounts", "/categories", "/settings"];

const LONG_PRESS_MS = 400;
const MOVE_THRESHOLD_PX = 10;
const HINT_STORAGE_KEY = "arthafiloka.ownerSwitcherHintSeen";
const HINT_AUTO_HIDE_MS = 6000;
const HINT_INITIAL_DELAY_MS = 1200;

export const BottomNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAppStore();

  const defaultOwnerKey: OwnerKey =
    currentUser?.role === "fifi" ? "fifi" : "arul";

  const activeOwnerFromPath = (
    Object.keys(ownerByPath) as Array<keyof typeof ownerByPath>
  ).find((p) => pathname.startsWith(p));
  const activeOwnerKey: OwnerKey = activeOwnerFromPath
    ? ownerByPath[activeOwnerFromPath]
    : defaultOwnerKey;

  const activeOwner =
    ownerOptions.find((o) => o.key === activeOwnerKey) ?? ownerOptions[0];

  const isOwnerSectionActive = !!activeOwnerFromPath;
  const isWishlistActive = pathname.startsWith("/wishlist");
  const isTransactionsActive = pathname.startsWith("/transactions");
  const isHomeActive = pathname.startsWith("/dashboard");
  const isMoreActive = moreRoutes.some((r) => pathname.startsWith(r));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-safe-bottom md:hidden">
      <div className="flex h-nav-height items-center justify-around">
        <NavLink
          href="/dashboard"
          icon={Home}
          label="Home"
          isActive={isHomeActive}
        />

        <OwnerSwitcher
          activeOwner={activeOwner}
          activeOwnerKey={activeOwnerKey}
          isActive={isOwnerSectionActive}
          onNavigate={(href) => router.push(href)}
        />

        <NavLink
          href="/wishlist"
          icon={Sparkles}
          label="Wishlist"
          isActive={isWishlistActive}
        />

        <NavLink
          href="/transactions"
          icon={Receipt}
          label="Transaksi"
          isActive={isTransactionsActive}
        />

        <NavLink
          href="/more"
          icon={MoreHorizontal}
          label="More"
          isActive={isMoreActive}
        />
      </div>
    </nav>
  );
};

interface OwnerSwitcherProps {
  activeOwner: (typeof ownerOptions)[number];
  activeOwnerKey: OwnerKey;
  isActive: boolean;
  onNavigate: (href: string) => void;
}

const OwnerSwitcher = ({
  activeOwner,
  activeOwnerKey,
  isActive,
  onNavigate,
}: OwnerSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const movedRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // First-visit coach mark — shown once, then dismissed permanently
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(HINT_STORAGE_KEY);
      if (seen) return;
    } catch {
      return;
    }

    const showTimer = setTimeout(() => setShowHint(true), HINT_INITIAL_DELAY_MS);
    const hideTimer = setTimeout(
      () => dismissHint(),
      HINT_INITIAL_DELAY_MS + HINT_AUTO_HIDE_MS
    );
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    try {
      window.localStorage.setItem(HINT_STORAGE_KEY, "1");
    } catch {
      /* ignore storage errors */
    }
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();

    longPressFiredRef.current = false;
    movedRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setPressing(true);

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      longPressTimerRef.current = null;
      setOpen(true);
      dismissHint();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(8);
      }
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startPosRef.current || !longPressTimerRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
      movedRef.current = true;
      clearLongPressTimer();
      setPressing(false);
    }
  };

  const handlePointerUp = () => {
    setPressing(false);

    if (longPressFiredRef.current) return;

    clearLongPressTimer();

    if (movedRef.current) return;

    if (open) {
      setOpen(false);
    } else {
      onNavigate(activeOwner.href);
    }
  };

  const handlePointerCancel = () => {
    setPressing(false);
    clearLongPressTimer();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(true);
    dismissHint();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) {
        setOpen(false);
      } else {
        onNavigate(activeOwner.href);
      }
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      dismissHint();
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) dismissHint();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative flex h-12 w-14 flex-col items-center justify-center gap-0.5 px-2 py-1",
            "transition-transform duration-150",
            "select-none touch-none",
            pressing && "scale-95",
            isActive
              ? "text-foreground font-semibold"
              : "text-muted-foreground"
          )}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`${activeOwner.label} — tap untuk buka, tahan untuk ganti pemilik`}
        >
          {/* Progress ring while pressing */}
          <PressProgressRing
            active={pressing}
            durationMs={LONG_PRESS_MS}
          />

          {/* Pulsing dot to invite exploration (idle hint) */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-primary",
              "transition-opacity duration-200",
              showHint ? "opacity-100 animate-pulse" : "opacity-0"
            )}
          />

          <ChevronUp
            className={cn(
              "absolute top-1 h-3 w-3 transition-all",
              open
                ? "opacity-100 translate-y-0"
                : showHint
                ? "opacity-90 -translate-y-px animate-bounce-soft"
                : "opacity-50"
            )}
            aria-hidden="true"
          />
          <activeOwner.icon className="h-5 w-5" />
          <span className="text-[10px]">{activeOwner.label}</span>

          {/* First-visit coach mark */}
          {showHint && (
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2",
                "whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5",
                "text-[11px] font-medium text-background shadow-md",
                "animate-fade-in-up"
              )}
            >
              Tahan untuk ganti
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2
                  border-x-4 border-t-4 border-x-transparent border-t-foreground"
              />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="center"
        sideOffset={8}
        className="min-w-[180px]"
      >
        {ownerOptions.map((opt) => {
          const isCurrent = opt.key === activeOwnerKey;
          return (
            <DropdownMenuItem
              key={opt.key}
              onSelect={() => onNavigate(opt.href)}
              className={cn("gap-3 py-2.5", isCurrent && "font-medium")}
            >
              <opt.icon className="h-4 w-4" />
              <span className="flex-1">{opt.label}</span>
              {isCurrent && <Check className="h-4 w-4 opacity-70" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface PressProgressRingProps {
  active: boolean;
  durationMs: number;
}

const PressProgressRing = ({ active, durationMs }: PressProgressRingProps) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 m-auto"
      width="48"
      height="48"
      viewBox="0 0 48 48"
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={active ? 0.55 : 0}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={active ? 0 : circumference}
        style={{
          transition: active
            ? `stroke-dashoffset ${durationMs}ms linear, stroke-opacity 100ms ease-out`
            : "stroke-dashoffset 150ms ease-out, stroke-opacity 200ms ease-out",
        }}
      />
    </svg>
  );
};

interface NavLinkProps {
  href: string;
  icon: typeof Home;
  label: string;
  isActive: boolean;
}

const NavLink = ({ href, icon: Icon, label, isActive }: NavLinkProps) => (
  <Link
    href={href}
    className={cn(
      "flex min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 py-2",
      isActive ? "text-foreground font-semibold" : "text-muted-foreground"
    )}
  >
    <Icon className="h-5 w-5" />
    <span className="text-[10px]">{label}</span>
  </Link>
);
