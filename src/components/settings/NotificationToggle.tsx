"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { SettingsRow } from "@/components/settings/SettingsRow";
import {
  disablePush,
  enablePush,
  getCurrentSubscription,
  getPushSupport,
  type PushSupport,
} from "@/lib/push/client";

const DESCRIPTIONS: Record<PushSupport, string> = {
  supported: "Pasangan mencatat, budget mepet, pengingat harian & rekap bulanan",
  "needs-install": "Di iPhone: Share → Add to Home Screen, lalu buka app dari ikon itu",
  unsupported: "Browser ini belum mendukung notifikasi",
};

/** Toggle push notification untuk HP/browser ini (langganan per perangkat). */
export const NotificationToggle = () => {
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const detected = getPushSupport();
    setSupport(detected);
    if (detected !== "supported") return;
    getCurrentSubscription()
      .then((sub) => setEnabled(!!sub && Notification.permission === "granted"))
      .catch(() => setEnabled(false));
  }, []);

  const handleChange = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        await enablePush();
        setEnabled(true);
        toast.success("Notifikasi aktif di HP ini");
      } else {
        await disablePush();
        setEnabled(false);
        toast.success("Notifikasi dimatikan di HP ini");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah notifikasi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsRow
      icon={Bell}
      label="Notifikasi di HP ini"
      description={DESCRIPTIONS[support]}
      htmlFor="push-toggle"
      trailing={
        <Switch
          id="push-toggle"
          checked={enabled}
          disabled={busy || support !== "supported"}
          onCheckedChange={(value) => void handleChange(value)}
          aria-label="Notifikasi di HP ini"
        />
      }
    />
  );
};
