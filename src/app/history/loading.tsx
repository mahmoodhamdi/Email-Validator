import { HistorySkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="container py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Validation History
          </h1>
          <p className="text-lg text-muted-foreground">
            View your recent email validations stored locally in your browser.
          </p>
        </div>
        <HistorySkeleton />
      </div>
    </div>
  );
}
