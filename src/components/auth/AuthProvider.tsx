"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { user, partner, isLoading } = useAuth();
  const { setCurrentUser, setPartner, setIsLoading } = useAppStore();

  useEffect(() => {
    setCurrentUser(user);
  }, [user, setCurrentUser]);

  useEffect(() => {
    setPartner(partner);
  }, [partner, setPartner]);

  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  return <>{children}</>;
};
