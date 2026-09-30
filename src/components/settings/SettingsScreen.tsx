"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Eye, Image as ImageIcon, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AvatarSection } from "@/components/settings/AvatarSection";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils/cn";
import pkg from "../../../package.json";

/** Layar Pengaturan: profil, tema, privasi, tentang, logout. */
export function SettingsScreen() {
  const { logout } = useAuth();
  const { currentUser, hideBalance, setHideBalance } = useAppStore();
  const { theme, setTheme } = useTheme();

  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setLogoutConfirm(false);
    }
  };

  return (
    <>
      <Header title="Pengaturan" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 pb-20 md:max-w-3xl md:p-6">
        {currentUser ? (
          <AvatarSection user={currentUser} />
        ) : (
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        )}

        <SettingsGroup title="Tampilan">
          <div className="px-3 py-3">
            <p className="text-xs text-muted-foreground mb-2">Tema</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted p-1">
              <ThemeOption active={theme === "light"} onClick={() => setTheme("light")} icon={Sun} label="Light" />
              <ThemeOption active={theme === "dark"} onClick={() => setTheme("dark")} icon={Moon} label="Dark" />
              <ThemeOption active={theme === "system"} onClick={() => setTheme("system")} icon={Monitor} label="Auto" />
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Privasi">
          <SettingsRow
            icon={Eye}
            label="Sembunyikan saldo"
            description="Saldo ditampilkan sebagai bullet"
            htmlFor="hide-balance-toggle"
            trailing={
              <Switch
                id="hide-balance-toggle"
                checked={hideBalance}
                onCheckedChange={setHideBalance}
                aria-label="Sembunyikan saldo otomatis"
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Tentang">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">Arthafiloka</p>
              <p className="text-xs text-muted-foreground mt-0.5">Keuangan rumah tangga Arul &amp; Fifi 💕</p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">v{pkg.version}</span>
          </div>
        </SettingsGroup>

        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setLogoutConfirm(true)}
        >
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>

      <ConfirmDialog
        open={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Logout?"
        description="Kamu akan keluar dari akun ini."
        confirmLabel="Logout"
        isLoading={isLoggingOut}
      />
    </>
  );
}

interface ThemeOptionProps {
  active: boolean;
  onClick: () => void;
  icon: typeof Sun;
  label: string;
}

const ThemeOption = ({ active, onClick, icon: Icon, label }: ThemeOptionProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1 rounded-md py-2 text-xs font-medium transition-colors",
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    )}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);
