"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/shared/LoadingState";

const ALLOWED_EMAILS = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "").split(",").map(e => e.trim());

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { firebaseUser, user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !firebaseUser) {
      router.replace("/login");
    }
  }, [firebaseUser, isLoading, router]);

  // Block unauthorized emails
  useEffect(() => {
    if (!isLoading && firebaseUser) {
      const email = firebaseUser.email || "";
      if (!ALLOWED_EMAILS.includes(email)) {
        logout();
        router.replace("/login");
      }
    }
  }, [firebaseUser, isLoading, logout, router]);

  useEffect(() => {
    if (!isLoading && firebaseUser && !user) {
      router.replace("/onboarding");
    }
  }, [firebaseUser, user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <LoadingState variant="page" />
      </div>
    );
  }

  if (!firebaseUser || !user) {
    return null;
  }

  return <>{children}</>;
};
