"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export const OfflineBadge = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-warning px-3 py-1.5 text-xs font-medium text-white">
      <WifiOff className="h-3 w-3" />
      <span>Offline — perubahan akan disinkronkan saat online</span>
    </div>
  );
};
