import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category: string;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      // Don't trigger shortcuts when typing in inputs (except specific ones)
      const target = event.target as HTMLElement;
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      const isContentEditable = target.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatch =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const altMatch = !!shortcut.alt === event.altKey;
        const shiftMatch = !!shortcut.shift === event.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          // Allow certain shortcuts even in inputs
          const allowInInput = shortcut.ctrl || shortcut.alt;

          if (isInput && !isContentEditable && !allowInInput) {
            continue;
          }

          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

/**
 * Format shortcut key for display
 */
export function formatShortcutKey(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  if (shortcut.ctrl) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (shortcut.alt) {
    parts.push(isMac ? "⌥" : "Alt");
  }
  if (shortcut.shift) {
    parts.push("⇧");
  }

  // Format special keys
  const keyMap: Record<string, string> = {
    " ": "Space",
    escape: "Esc",
    enter: "↵",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };

  const displayKey =
    keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase();
  parts.push(displayKey);

  return parts.join(" + ");
}
