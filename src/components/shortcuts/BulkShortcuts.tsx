"use client";

import { useEffect } from "react";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import { KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

interface BulkShortcutsProps {
  onValidateAll: () => void;
  onExport: () => void;
  onClear: () => void;
}

export function BulkShortcuts({
  onValidateAll,
  onExport,
  onClear,
}: BulkShortcutsProps) {
  const { registerShortcuts, unregisterShortcuts } = useShortcuts();

  useEffect(() => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "Enter",
        ctrl: true,
        action: onValidateAll,
        description: "Validate all emails",
        category: "Bulk Page",
      },
      {
        key: "e",
        ctrl: true,
        action: onExport,
        description: "Export results",
        category: "Bulk Page",
      },
      {
        key: "k",
        ctrl: true,
        action: onClear,
        description: "Clear all",
        category: "Bulk Page",
      },
    ];

    registerShortcuts(shortcuts);

    return () => {
      unregisterShortcuts(shortcuts.map((s) => s.key + (s.ctrl ? "-ctrl" : "")));
    };
  }, [registerShortcuts, unregisterShortcuts, onValidateAll, onExport, onClear]);

  return null;
}
