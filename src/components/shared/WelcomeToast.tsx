"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";

const SESSION_KEY = "arthafiloka.welcomeToastShown";

interface Greeting {
  text: (name: string) => string;
  emoji: string;
  description?: string;
}

/**
 * Time-of-day greeting buckets. 5–11 pagi, 11–15 siang, 15–18 sore,
 * 18–22 malam, sisanya larut. Tone Bahasa Indonesia, casual.
 */
const greetingForHour = (hour: number): Greeting => {
  if (hour >= 5 && hour < 11) {
    return {
      text: (n) => `Pagi, ${n}`,
      emoji: "☕",
      description: "Mau ngopi dulu atau langsung catet pengeluaran?",
    };
  }
  if (hour >= 11 && hour < 15) {
    return {
      text: (n) => `Halo, ${n}`,
      emoji: "🍜",
      description: "Udah makan siang? Jangan lupa catet ya.",
    };
  }
  if (hour >= 15 && hour < 18) {
    return {
      text: (n) => `Sore, ${n}`,
      emoji: "🌤️",
    };
  }
  if (hour >= 18 && hour < 22) {
    return {
      text: (n) => `Malam, ${n}`,
      emoji: "🌙",
      description: "Udah bayar tagihan hari ini?",
    };
  }
  return {
    text: (n) => `Hai, ${n}`,
    emoji: "🦉",
    description: "Lagi begadang? Jangan lupa istirahat.",
  };
};

/**
 * Welcome toast time-based — Personalization Plan §3.13.
 *
 * Trigger sekali per session (per browser tab) ketika user pertama kali
 * masuk app. Skip kalau `preferences.showMemes` di-off (toggle yang sama
 * dipakai sebagai opt-out untuk semua flair).
 */
export const WelcomeToast = () => {
  const currentUser = useAppStore((s) => s.currentUser);
  const isLoading = useAppStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading || !currentUser) return;
    if (currentUser.preferences?.showMemes === false) return;

    let alreadyShown = false;
    try {
      alreadyShown =
        typeof window !== "undefined" &&
        window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return; // sessionStorage unavailable → skip silently
    }
    if (alreadyShown) return;

    const greeting = greetingForHour(new Date().getHours());
    const firstName = currentUser.displayName.split(" ")[0] || currentUser.displayName;

    toast(`${greeting.text(firstName)} ${greeting.emoji}`, {
      description: greeting.description,
      duration: 4000,
    });

    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [currentUser, isLoading]);

  return null;
};
