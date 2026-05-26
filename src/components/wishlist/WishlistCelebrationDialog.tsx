"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MemeReaction } from "@/components/shared/MemeReaction";

interface WishlistCelebrationDialogProps {
  open: boolean;
  onClose: () => void;
  totalCount: number;
}

/**
 * Modal yang muncul sekali ketika progress wishlist mencapai 100%.
 * Trigger logic-nya ada di parent (`WishlistPage`) — pakai sessionStorage
 * supaya cuma muncul sekali per session, bukan tiap reload.
 */
export const WishlistCelebrationDialog = ({
  open,
  onClose,
  totalCount,
}: WishlistCelebrationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        <div className="flex justify-center pt-2">
          <MemeReaction mood="celebrate" size="lg" seed="wishlist-100" />
        </div>
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl">Yay, semua tercapai! 🎉</DialogTitle>
          <DialogDescription>
            {totalCount} item di wishlist udah kebeli semua. Saatnya bikin
            wishlist baru bareng.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Yay rayain 🎉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
