import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import {
  ShortcutsProvider,
  useShortcuts,
} from "@/contexts/ShortcutsContext";
import { KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ShortcutsProvider>{children}</ShortcutsProvider>
);

describe("ShortcutsContext", () => {
  it("should provide default values", () => {
    const { result } = renderHook(() => useShortcuts(), { wrapper });

    expect(result.current.shortcuts).toEqual([]);
    expect(result.current.isHelpOpen).toBe(false);
    expect(result.current.enabled).toBe(true);
  });

  it("should register shortcuts", () => {
    const { result } = renderHook(() => useShortcuts(), { wrapper });

    const newShortcuts: KeyboardShortcut[] = [
      {
        key: "k",
        ctrl: true,
        action: () => {},
        description: "Test shortcut",
        category: "Test",
      },
    ];

    act(() => {
      result.current.registerShortcuts(newShortcuts);
    });

    expect(result.current.shortcuts).toHaveLength(1);
    expect(result.current.shortcuts[0].key).toBe("k");
  });

  it("should unregister shortcuts by key", () => {
    const { result } = renderHook(() => useShortcuts(), { wrapper });

    const shortcuts: KeyboardShortcut[] = [
      {
        key: "k",
        ctrl: true,
        action: () => {},
        description: "First shortcut",
        category: "Test",
      },
      {
        key: "j",
        ctrl: true,
        action: () => {},
        description: "Second shortcut",
        category: "Test",
      },
    ];

    act(() => {
      result.current.registerShortcuts(shortcuts);
    });

    expect(result.current.shortcuts).toHaveLength(2);

    act(() => {
      result.current.unregisterShortcuts(["k-ctrl"]);
    });

    expect(result.current.shortcuts).toHaveLength(1);
    expect(result.current.shortcuts[0].key).toBe("j");
  });

  it("should open and close help modal", () => {
    const { result } = renderHook(() => useShortcuts(), { wrapper });

    expect(result.current.isHelpOpen).toBe(false);

    act(() => {
      result.current.openHelp();
    });

    expect(result.current.isHelpOpen).toBe(true);

    act(() => {
      result.current.closeHelp();
    });

    expect(result.current.isHelpOpen).toBe(false);
  });

  it("should enable and disable shortcuts", () => {
    const { result } = renderHook(() => useShortcuts(), { wrapper });

    expect(result.current.enabled).toBe(true);

    act(() => {
      result.current.setEnabled(false);
    });

    expect(result.current.enabled).toBe(false);

    act(() => {
      result.current.setEnabled(true);
    });

    expect(result.current.enabled).toBe(true);
  });

  it("should not duplicate shortcuts with same key", () => {
    const { result } = renderHook(() => useShortcuts(), { wrapper });

    const shortcut1: KeyboardShortcut = {
      key: "k",
      ctrl: true,
      action: () => {},
      description: "First",
      category: "Test",
    };

    const shortcut2: KeyboardShortcut = {
      key: "k",
      ctrl: true,
      action: () => {},
      description: "Second",
      category: "Test",
    };

    act(() => {
      result.current.registerShortcuts([shortcut1]);
    });

    act(() => {
      result.current.registerShortcuts([shortcut2]);
    });

    // Should replace, not duplicate
    expect(result.current.shortcuts).toHaveLength(1);
    expect(result.current.shortcuts[0].description).toBe("Second");
  });

  it("should throw error when used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useShortcuts());
    }).toThrow("useShortcuts must be used within a ShortcutsProvider");

    consoleSpy.mockRestore();
  });
});
