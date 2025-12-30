"use client";

import { useShortcuts } from "@/contexts/ShortcutsContext";
import { formatShortcutKey } from "@/hooks/useKeyboardShortcuts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

export function ShortcutsHelp() {
  const { shortcuts, isHelpOpen, closeHelp } = useShortcuts();

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, typeof shortcuts>
  );

  // Sort categories in a specific order
  const categoryOrder = ["General", "Navigation", "Actions", "Home Page", "Bulk Page"];
  const sortedCategories = Object.keys(groupedShortcuts).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b);
    }
    if (aIndex === -1) {
      return 1;
    }
    if (bIndex === -1) {
      return -1;
    }
    return aIndex - bIndex;
  });

  return (
    <Dialog open={isHelpOpen} onOpenChange={closeHelp}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {sortedCategories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {groupedShortcuts[category].map((shortcut, index) => (
                  <div
                    key={`${shortcut.key}-${index}`}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <Badge variant="outline" className="font-mono">
                      {formatShortcutKey(shortcut)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Press{" "}
          <Badge variant="outline" className="font-mono text-xs">
            ?
          </Badge>{" "}
          to show this help anytime
        </p>
      </DialogContent>
    </Dialog>
  );
}
