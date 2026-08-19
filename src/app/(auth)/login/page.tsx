"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/shared/Logo";
import { getCachedCoupleDataUrl } from "@/hooks/useCouplePhoto";

const ALLOWED_EMAILS = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "")
  .split(",")
  .map((e) => e.trim());

/**
 * Foto couple sebagai background blur. Sumber:
 *   1. Cache localStorage — last-known uploaded data URL
 *      (di-update di Settings setelah login).
 *   2. Local fallback `/photos/couple/default.jpg`.
 *   3. Gradient placeholder kalau dua-duanya gagal.
 *
 * Kita ga fetch dari Firestore di sini karena belum auth — rules block.
 */
const COUPLE_BG_FALLBACK = "/photos/couple/default.jpg";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bgAttempt, setBgAttempt] = useState(0);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);

  // Hydrate cache di client (avoid SSR mismatch).
  useEffect(() => {
    setCachedUrl(getCachedCoupleDataUrl());
    setBgAttempt(0);
  }, []);

  const candidates = [cachedUrl, COUPLE_BG_FALLBACK].filter(
    (s): s is string => !!s
  );
  const bgSrc = candidates[bgAttempt];
  const bgErrored = bgAttempt >= candidates.length;

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await loginWithGoogle();
      const email = result.user.email;

      if (!email || !ALLOWED_EMAILS.includes(email)) {
        // Sign out immediately if not allowed
        const { signOut } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase");
        await signOut(auth);
        setError("Akses ditolak. Akun ini tidak terdaftar.");
        setIsLoading(false);
        return;
      }

      router.push("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal login dengan Google";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Background layer — fixed full-bleed di belakang centered card.
          Auth layout-nya flex-centered, jadi kita absolute-positioned biar
          ga ganggu vertical centering. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 overflow-hidden bg-background"
      >
        {!bgErrored && bgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgSrc}
            alt=""
            onError={() => setBgAttempt((n) => n + 1)}
            className="h-full w-full object-cover scale-105 blur-md opacity-40 dark:opacity-25"
          />
        )}
        {/* Gradient overlay untuk legibility — selalu nimpa foto. */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </div>

      <Card className="w-full max-w-sm relative shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Logo size="lg" showText={false} />
          </div>
          <CardTitle className="text-2xl font-semibold">Arthafiloka</CardTitle>
          <CardDescription>Masuk dengan akun Google kamu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Login dengan Google"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Hanya untuk Arul & Fifi 💕
          </p>
        </CardContent>
      </Card>
    </>
  );
}
