"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ServiceWorkerRegistrar } from "@/components/shared/ServiceWorkerRegistrar";

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>{children}</AuthProvider>
      <Toaster position="top-center" richColors />
      <ServiceWorkerRegistrar />
    </ThemeProvider>
  );
};
