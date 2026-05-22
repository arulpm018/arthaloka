"use client";

import { useState } from "react";
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

const ALLOWED_EMAILS = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "").split(",").map(e => e.trim());

export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal login dengan Google";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold">Arthaloka</CardTitle>
        <CardDescription>
          Masuk dengan akun Google kamu
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-xs text-destructive text-center">{error}</p>}

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
  );
}
