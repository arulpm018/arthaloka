"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Eye,
  Heart,
  Image as ImageIcon,
  LogOut,
  Monitor,
  Moon,
  Smile,
  Sun,
  Wallet,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AvatarSection } from "@/components/settings/AvatarSection";
import { AnniversaryRow } from "@/components/settings/AnniversaryRow";
import { CouplePhotoSheet } from "@/components/settings/CouplePhotoSheet";
import { MemeManagerSheet } from "@/components/settings/MemeManagerSheet";
import {
  SettingsGroup,
  SettingsRow,
} from "@/components/settings/SettingsRow";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useAppStore } from "@/store/useAppStore";
import { useCustomMemes } from "@/hooks/useCustomMemes";
import { useCouplePhoto } from "@/hooks/useCouplePhoto";
import { usersService } from "@/lib/firestore/users";
import { cn } from "@/lib/utils/cn";
import pkg from "../../../../package.json";

export default function SettingsPage() {
  const { logout, firebaseUser } = useAuth();
  const { currentUser, hideBalance, setHideBalance } = useAppStore();
  const { accounts } = useAccounts();
  const { theme, setTheme } = useTheme();
  const { memes } = useCustomMemes();
  const { photo: couplePhoto } = useCouplePhoto();

  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [coupleSheetOpen, setCoupleSheetOpen] = useState(false);
  const [memeSheetOpen, setMemeSheetOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setLogoutConfirm(false);
    }
  };

  const handleDefaultAccount = async (accountId: string) => {
    if (!firebaseUser) return;
    await usersService.updatePreferences(firebaseUser.uid, {
      defaultAccountId: accountId,
    });
  };

  const showMemes = currentUser?.preferences?.showMemes ?? true;
  const handleShowMemesChange = async (next: boolean) => {
    if (!firebaseUser) return;
    await usersService.updatePreferences(firebaseUser.uid, {
      showMemes: next,
    });
  };

  // Pretty preview untuk row — foto bareng kecil bulat kalau ada.
  const couplePhotoBadge = couplePhoto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={couplePhoto.dataUrl}
      alt=""
      className="h-8 w-8 rounded-md object-cover"
    />
  ) : (
    <span className="text-xs text-muted-foreground">Belum diset</span>
  );

  const memeCountBadge =
    memes.length > 0 ? (
      <span className="text-xs text-muted-foreground tabular-nums">
        {memes.length} meme
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">Default</span>
    );

  // Default account — get nama untuk display
  const defaultAccountId = currentUser?.preferences?.defaultAccountId ?? "";
  const eligibleAccounts = accounts.filter(
    (acc) => acc.owner === currentUser?.role || acc.owner === "shared"
  );

  return (
    <>
      <Header title="Settings" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 pb-20 md:max-w-3xl md:p-6">
        {/* Profile hero */}
        {currentUser ? (
          <AvatarSection user={currentUser} />
        ) : (
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        )}

        {/* Personalisasi — couple photo + memes via bottom sheets */}
        <SettingsGroup title="Personalisasi">
          <SettingsRow
            icon={Heart}
            label="Foto bareng"
            description="Tampil di login & halaman Bareng"
            trailing={couplePhotoBadge}
            onClick={() => setCoupleSheetOpen(true)}
          />
          <SettingsRow
            icon={Smile}
            label="Meme reaction"
            description="Reaksi GIF berdasarkan kondisi keuangan"
            trailing={memeCountBadge}
            onClick={() => setMemeSheetOpen(true)}
          />
          {firebaseUser && (
            <AnniversaryRow
              uid={firebaseUser.uid}
              value={currentUser?.relationship?.anniversaryDate}
            />
          )}
        </SettingsGroup>

        {/* Preferensi — default account */}
        <SettingsGroup title="Preferensi">
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  Akun default
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pre-fill di form transaksi
                </p>
              </div>
              <Select
                value={defaultAccountId}
                onValueChange={handleDefaultAccount}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleAccounts.map((acc) => (
                    <SelectItem key={acc.accountId} value={acc.accountId}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsGroup>

        {/* Tampilan — theme picker */}
        <SettingsGroup title="Tampilan">
          <div className="px-3 py-3">
            <p className="text-xs text-muted-foreground mb-2">Tema</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted p-1">
              <ThemeOption
                active={theme === "light"}
                onClick={() => setTheme("light")}
                icon={Sun}
                label="Light"
              />
              <ThemeOption
                active={theme === "dark"}
                onClick={() => setTheme("dark")}
                icon={Moon}
                label="Dark"
              />
              <ThemeOption
                active={theme === "system"}
                onClick={() => setTheme("system")}
                icon={Monitor}
                label="Auto"
              />
            </div>
          </div>
        </SettingsGroup>

        {/* Privasi — switches */}
        <SettingsGroup title="Privasi">
          <SettingsRow
            icon={Eye}
            label="Sembunyikan saldo"
            description="Saldo ditampilkan sebagai bullet di hero card"
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
          <SettingsRow
            icon={Smile}
            label="Tampilkan meme"
            description="Reaksi GIF di hero, alert, empty state"
            htmlFor="show-memes-toggle"
            trailing={
              <Switch
                id="show-memes-toggle"
                checked={showMemes}
                onCheckedChange={handleShowMemesChange}
                aria-label="Tampilkan meme reaction"
              />
            }
          />
        </SettingsGroup>

        {/* Tentang */}
        <SettingsGroup title="Tentang">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">Arthafiloka</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aplikasi pribadi untuk Arul &amp; Fifi 💕
              </p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              v{pkg.version}
            </span>
          </div>
        </SettingsGroup>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setLogoutConfirm(true)}
        >
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>

      <CouplePhotoSheet
        open={coupleSheetOpen}
        onClose={() => setCoupleSheetOpen(false)}
      />
      {firebaseUser && (
        <MemeManagerSheet
          open={memeSheetOpen}
          onClose={() => setMemeSheetOpen(false)}
          uid={firebaseUser.uid}
        />
      )}

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

const ThemeOption = ({
  active,
  onClick,
  icon: Icon,
  label,
}: ThemeOptionProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1 rounded-md py-2 text-xs font-medium transition-colors",
      active
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);
