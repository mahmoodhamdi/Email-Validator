import { renderHook, act } from "@testing-library/react";
import {
  useKeyboardShortcuts,
  formatShortcutKey,
  KeyboardShortcut,
} from "@/hooks/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  let mockAction: jest.Mock;
  let shortcuts: KeyboardShortcut[];

  beforeEach(() => {
    mockAction = jest.fn();
    shortcuts = [
      {
        key: "k",
        ctrl: true,
        action: mockAction,
        description: "Test shortcut",
        category: "Test",
      },
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should trigger action on matching keyboard shortcut", () => {
    renderHook(() => useKeyboardShortcuts(shortcuts, true));

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it("should not trigger action when disabled", () => {
    renderHook(() => useKeyboardShortcuts(shortcuts, false));

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it("should not trigger action for non-matching keys", () => {
    renderHook(() => useKeyboardShortcuts(shortcuts, true));

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "j",
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it("should not trigger action when ctrl is not pressed", () => {
    renderHook(() => useKeyboardShortcuts(shortcuts, true));

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: false,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(mockAction).not.toHaveBeenCalled();
  });

  it("should handle shift modifier", () => {
    const shiftShortcuts: KeyboardShortcut[] = [
      {
        key: "?",
        shift: true,
        action: mockAction,
        description: "Help",
        category: "General",
      },
    ];

    renderHook(() => useKeyboardShortcuts(shiftShortcuts, true));

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "?",
        shiftKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it("should handle alt modifier", () => {
    const altShortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        alt: true,
        action: mockAction,
        description: "Alt shortcut",
        category: "Test",
      },
    ];

    renderHook(() => useKeyboardShortcuts(altShortcuts, true));

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "s",
        altKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it("should cleanup event listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts, true));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
    removeEventListenerSpy.mockRestore();
  });
});

describe("formatShortcutKey", () => {
  it("should format ctrl shortcut", () => {
    const shortcut: KeyboardShortcut = {
      key: "k",
      ctrl: true,
      action: () => {},
      description: "Test",
      category: "Test",
    };

    const result = formatShortcutKey(shortcut);
    expect(result).toMatch(/Ctrl|⌘/);
    expect(result).toContain("K");
  });

  it("should format shift shortcut", () => {
    const shortcut: KeyboardShortcut = {
      key: "?",
      shift: true,
      action: () => {},
      description: "Test",
      category: "Test",
    };

    const result = formatShortcutKey(shortcut);
    expect(result).toMatch(/Shift|⇧/);
  });

  it("should format alt shortcut", () => {
    const shortcut: KeyboardShortcut = {
      key: "s",
      alt: true,
      action: () => {},
      description: "Test",
      category: "Test",
    };

    const result = formatShortcutKey(shortcut);
    expect(result).toMatch(/Alt|⌥/);
  });

  it("should format single key shortcut", () => {
    const shortcut: KeyboardShortcut = {
      key: "/",
      action: () => {},
      description: "Test",
      category: "Test",
    };

    const result = formatShortcutKey(shortcut);
    expect(result).toBe("/");
  });

  it("should format special keys correctly", () => {
    const shortcut: KeyboardShortcut = {
      key: "Enter",
      ctrl: true,
      action: () => {},
      description: "Test",
      category: "Test",
    };

    const result = formatShortcutKey(shortcut);
    expect(result).toContain("↵");
  });

  it("should format Escape key correctly", () => {
    const shortcut: KeyboardShortcut = {
      key: "Escape",
      action: () => {},
      description: "Test",
      category: "Test",
    };

    const result = formatShortcutKey(shortcut);
    expect(result).toBe("Esc");
  });
});
