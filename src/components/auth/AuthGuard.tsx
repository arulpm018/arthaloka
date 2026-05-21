"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/shared/LoadingState";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { firebaseUser, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !firebaseUser) {
      router.replace("/login");
    }
  }, [firebaseUser, isLoading, router]);

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
