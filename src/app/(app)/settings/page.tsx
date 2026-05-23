"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun, Monitor, User } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useAppStore } from "@/store/useAppStore";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SettingsPage() {
  const { logout, firebaseUser } = useAuth();
  const { currentUser } = useAppStore();
  const { accounts } = useAccounts();
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

  const handleDefaultAccount = async (accountId: string) => {
    if (!firebaseUser) return;
    await updateDoc(doc(db, "users", firebaseUser.uid), {
      "preferences.defaultAccountId": accountId,
    });
  };

  return (
    <>
      <Header title="Settings" />
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Profile */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Profil
          </h3>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {currentUser?.displayName || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentUser?.email}
              </p>
            </div>
          </div>
        </section>

        {/* Default Account */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Preferensi
          </h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Akun Default</label>
            <Select
              value={currentUser?.preferences?.defaultAccountId || ""}
              onValueChange={handleDefaultAccount}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih akun default" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.accountId} value={acc.accountId}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Theme */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Tampilan
          </h3>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
              className="flex-1"
            >
              <Sun className="h-4 w-4 mr-1" /> Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
              className="flex-1"
            >
              <Moon className="h-4 w-4 mr-1" /> Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}
              className="flex-1"
            >
              <Monitor className="h-4 w-4 mr-1" /> Auto
            </Button>
          </div>
        </section>

        {/* Logout */}
        <section>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setLogoutConfirm(true)}
          >
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </section>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground">
          Arthafiloka v0.1.0
        </p>
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
