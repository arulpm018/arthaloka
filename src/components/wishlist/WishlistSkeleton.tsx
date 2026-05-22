"use client";

import { Skeleton } from "@/components/ui/skeleton";

export const WishlistSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Progress bar area */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      {/* Category sections */}
      {Array.from({ length: 2 }).map((_, sectionIdx) => (
        <div key={sectionIdx} className="space-y-3">
          {/* Category header */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-28" />
            <div className="flex-1" />
            <Skeleton className="h-3 w-16" />
          </div>

          {/* Item cards */}
          {Array.from({ length: 3 }).map((_, itemIdx) => (
            <div key={itemIdx} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
