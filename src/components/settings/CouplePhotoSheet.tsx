"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CouplePhotoSection } from "@/components/settings/CouplePhotoSection";

interface CouplePhotoSheetProps {
  open: boolean;
  onClose: () => void;
}

export const CouplePhotoSheet = ({ open, onClose }: CouplePhotoSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Foto bareng</SheetTitle>
          <SheetDescription>
            Tampil di login background dan halaman Bareng. Otomatis di-resize
            ke 1024px.
          </SheetDescription>
        </SheetHeader>
        <CouplePhotoSection />
      </SheetContent>
    </Sheet>
  );
};
