import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function BulkResultsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary skeleton */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results list skeleton */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
