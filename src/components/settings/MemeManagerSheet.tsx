"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { MemeManager } from "@/components/settings/MemeManager";

interface MemeManagerSheetProps {
  open: boolean;
  onClose: () => void;
  uid: string;
}

export const MemeManagerSheet = ({
  open,
  onClose,
  uid,
}: MemeManagerSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Meme reaction</SheetTitle>
          <SheetDescription>
            Upload meme custom per mood. Yang di-upload langsung kepake di
            hero, budget alert, wishlist celebration, dan empty state.
          </SheetDescription>
        </SheetHeader>
        <MemeManager uid={uid} />
      </SheetContent>
    </Sheet>
  );
};
