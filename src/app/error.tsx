'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Application error:', error);
  }, [error]);

  const handleClearDataAndReload = () => {
    try {
      // Clear potentially corrupted localStorage data
      localStorage.removeItem('email-validator-history');
      localStorage.removeItem('email-validator-settings');
    } catch {
      // localStorage might not be available
    }
    // Reload the page
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Something went wrong!</h2>
      <p className="text-muted-foreground mb-4 max-w-md">
        An unexpected error occurred. You can try again or return to the home page.
      </p>

      {error.message && (
        <div className="bg-muted rounded-lg p-4 mb-6 max-w-md w-full">
          <p className="text-sm font-mono text-muted-foreground break-all">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4 justify-center">
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
        <Button variant="destructive" onClick={handleClearDataAndReload}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Data & Reload
        </Button>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        If this problem persists, please{' '}
        <a
          href="https://github.com/anthropics/claude-code/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          report the issue
        </a>
        .
      </p>
    </div>
  );
}
