"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import {
  useKeyboardShortcuts,
  KeyboardShortcut,
} from "@/hooks/useKeyboardShortcuts";
import { ShortcutsHelp } from "./ShortcutsHelp";

export function GlobalShortcuts() {
  const router = useRouter();
  const { registerShortcuts, openHelp, enabled, shortcuts } = useShortcuts();

  useEffect(() => {
    const globalShortcuts: KeyboardShortcut[] = [
      // Help
      {
        key: "?",
        shift: true,
        action: openHelp,
        description: "Show keyboard shortcuts",
        category: "General",
      },
      // Navigation
      {
        key: "h",
        ctrl: true,
        action: () => router.push("/"),
        description: "Go to Home",
        category: "Navigation",
      },
      {
        key: "b",
        ctrl: true,
        action: () => router.push("/bulk"),
        description: "Go to Bulk Validation",
        category: "Navigation",
      },
      {
        key: "i",
        ctrl: true,
        action: () => router.push("/history"),
        description: "Go to History",
        category: "Navigation",
      },
      {
        key: "d",
        ctrl: true,
        action: () => router.push("/api-docs"),
        description: "Go to API Docs",
        category: "Navigation",
      },
      // Actions
      {
        key: "/",
        action: () => {
          const input = document.querySelector<HTMLInputElement>(
            'input[type="email"], input[name="email"], input[placeholder*="email" i]'
          );
          input?.focus();
        },
        description: "Focus email input",
        category: "Actions",
      },
      {
        key: "Escape",
        action: () => {
          const activeElement = document.activeElement as HTMLElement;
          activeElement?.blur();
        },
        description: "Unfocus / Close modal",
        category: "Actions",
      },
    ];

    registerShortcuts(globalShortcuts);
  }, [registerShortcuts, router, openHelp]);

  useKeyboardShortcuts(shortcuts, enabled);

  return <ShortcutsHelp />;
}
