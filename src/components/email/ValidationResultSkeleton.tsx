"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the ValidationResult component.
 * Matches the layout of the actual result for smooth transitions.
 */
export function ValidationResultSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            {/* Email address */}
            <Skeleton className="h-6 w-48" />
            {/* Status badges */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          {/* Score indicator */}
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Check items */}
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
            >
              {/* Status icon */}
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Check label */}
                <Skeleton className="h-4 w-20" />
                {/* Check message */}
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
