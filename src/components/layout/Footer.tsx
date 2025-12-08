import { Mail, Github, Heart } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>Email Validator</span>
          <span className="hidden sm:inline">-</span>
          <span className="hidden sm:inline">Professional email validation tool</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link
            href="https://github.com/mahmoodhamdi/Email-Validator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </Link>
          <span className="flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" />
          </span>
        </div>
      </div>
    </footer>
  );
}
