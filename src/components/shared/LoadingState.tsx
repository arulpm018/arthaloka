import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  variant?: "page" | "cards" | "list" | "transaction-list";
  count?: number;
}

export const LoadingState = ({ variant = "page", count = 3 }: LoadingStateProps) => {
  switch (variant) {
    case "cards":
      return (
        <div className="flex gap-3 overflow-x-auto px-4 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 min-w-[140px] rounded-xl" />
          ))}
        </div>
      );

    case "list":
      return (
        <div className="space-y-3 px-4">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      );

    case "transaction-list":
      return (
        <div className="space-y-2 px-4">
          <Skeleton className="h-4 w-24 mb-2" />
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      );

    case "page":
    default:
      return (
        <div className="space-y-6 p-4">
          {/* Summary cards skeleton */}
          <div className="flex gap-3 overflow-x-auto">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 min-w-[140px] rounded-xl" />
            ))}
          </div>
          {/* Chart skeleton */}
          <Skeleton className="h-48 w-full rounded-xl" />
          {/* List skeleton */}
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      );
  }
};
