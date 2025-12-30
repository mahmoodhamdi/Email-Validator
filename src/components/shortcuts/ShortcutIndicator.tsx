"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ShortcutIndicatorProps {
  shortcut: string;
  className?: string;
}

export function ShortcutIndicator({
  shortcut,
  className,
}: ShortcutIndicatorProps) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-mono opacity-60", className)}
    >
      {shortcut}
    </Badge>
  );
}
