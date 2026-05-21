"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";

export default function OnboardingPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"arul" | "fifi" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async () => {
    if (!firebaseUser) return;
    if (!displayName.trim()) {
      setError("Nama harus diisi");
      return;
    }
    if (!role) {
      setError("Pilih role kamu");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const inviteCode = generateInviteCode();

      await setDoc(doc(db, "users", firebaseUser.uid), {
        uid: firebaseUser.uid,
        displayName: displayName.trim(),
        email: firebaseUser.email || "",
        photoURL: firebaseUser.photoURL || null,
        role,
        currency: "IDR",
        preferences: {
          theme: "system",
          quickCategories: [],
        },
        inviteCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan profil";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold">
          Selamat Datang!
        </CardTitle>
        <CardDescription>Setup profil kamu dulu ya</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Nama</label>
          <Input
            placeholder="Nama kamu"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Kamu siapa?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={role === "arul" ? "default" : "outline"}
              onClick={() => setRole("arul")}
              className="h-12"
            >
              👨 Arul
            </Button>
            <Button
              type="button"
              variant={role === "fifi" ? "default" : "outline"}
              onClick={() => setRole("fifi")}
              className="h-12"
            >
              👩 Fifi
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={isLoading || !displayName.trim() || !role}
        >
          {isLoading ? "Menyimpan..." : "Lanjut"}
        </Button>
      </CardContent>
    </Card>
  );
}
