"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

interface ShortcutsContextType {
  shortcuts: KeyboardShortcut[];
  registerShortcuts: (shortcuts: KeyboardShortcut[]) => void;
  unregisterShortcuts: (keys: string[]) => void;
  isHelpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const registerShortcuts = useCallback((newShortcuts: KeyboardShortcut[]) => {
    setShortcuts((prev) => {
      const keys = newShortcuts.map((s) => s.key + (s.ctrl ? "-ctrl" : ""));
      const filtered = prev.filter(
        (s) => !keys.includes(s.key + (s.ctrl ? "-ctrl" : ""))
      );
      return [...filtered, ...newShortcuts];
    });
  }, []);

  const unregisterShortcuts = useCallback((keys: string[]) => {
    setShortcuts((prev) =>
      prev.filter((s) => !keys.includes(s.key + (s.ctrl ? "-ctrl" : "")))
    );
  }, []);

  const openHelp = useCallback(() => setIsHelpOpen(true), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);

  return (
    <ShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcuts,
        unregisterShortcuts,
        isHelpOpen,
        openHelp,
        closeHelp,
        enabled,
        setEnabled,
      }}
    >
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error("useShortcuts must be used within a ShortcutsProvider");
  }
  return context;
}
