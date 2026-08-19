import { AuthGuard } from "@/components/auth/AuthGuard";
import { ProductivityShell } from "@/components/productivity/layout/ProductivityShell";

export default function ProductivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ProductivityShell>{children}</ProductivityShell>
    </AuthGuard>
  );
}
