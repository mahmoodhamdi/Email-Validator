"use client";

import { useEffect } from "react";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import { KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

interface HomeShortcutsProps {
  onValidate: () => void;
  onClear: () => void;
}

export function HomeShortcuts({ onValidate, onClear }: HomeShortcutsProps) {
  const { registerShortcuts, unregisterShortcuts } = useShortcuts();

  useEffect(() => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "Enter",
        ctrl: true,
        action: onValidate,
        description: "Validate email",
        category: "Home Page",
      },
      {
        key: "k",
        ctrl: true,
        action: onClear,
        description: "Clear input",
        category: "Home Page",
      },
    ];

    registerShortcuts(shortcuts);

    return () => {
      unregisterShortcuts(shortcuts.map((s) => s.key + (s.ctrl ? "-ctrl" : "")));
    };
  }, [registerShortcuts, unregisterShortcuts, onValidate, onClear]);

  return null;
}
