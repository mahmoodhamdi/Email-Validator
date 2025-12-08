"use client";

import { useRouter } from "next/navigation";
import { ValidationHistory } from "@/components/email/ValidationHistory";

export default function HistoryPage() {
  const router = useRouter();

  const handleRevalidate = (email: string) => {
    // Navigate to home page with email as query param
    router.push(`/?email=${encodeURIComponent(email)}`);
  };

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
        <ValidationHistory onRevalidate={handleRevalidate} />
      </div>
    </div>
  );
}
