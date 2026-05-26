import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { CustomMemesProvider } from "@/components/shared/CustomMemesProvider";
import { CouplePhotoProvider } from "@/components/shared/CouplePhotoProvider";
import { WelcomeToast } from "@/components/shared/WelcomeToast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <CouplePhotoProvider>
        <CustomMemesProvider>
          <AppShell>{children}</AppShell>
          <WelcomeToast />
        </CustomMemesProvider>
      </CouplePhotoProvider>
    </AuthGuard>
  );
}
