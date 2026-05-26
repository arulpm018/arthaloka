import { cn } from "@/lib/utils/cn";
import { LucideIcon } from "lucide-react";
import { MemeReaction } from "@/components/shared/MemeReaction";
import type { MoodKey } from "@/lib/constants/memes";

interface EmptyStateProps {
  icon?: LucideIcon;
  /**
   * Optional mood — kalau di-set, render `<MemeReaction>` (auto fallback ke
   * emoji unicode kalau aset belum ada). Kalau `meme` dan `icon` keduanya
   * di-set, `meme` menang.
   */
  meme?: MoodKey;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  meme,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {meme ? (
        <div className="mb-4">
          <MemeReaction mood={meme} size="md" seed={`empty-${meme}`} />
        </div>
      ) : Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : null}
      <h3 className="text-sm font-medium">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
