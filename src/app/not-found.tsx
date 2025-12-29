import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search, History, Mail } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-8">
        <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/bulk">
            <Search className="mr-2 h-4 w-4" />
            Bulk Validate
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/history">
            <History className="mr-2 h-4 w-4" />
            View History
          </Link>
        </Button>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        If you believe this is an error, please{' '}
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
