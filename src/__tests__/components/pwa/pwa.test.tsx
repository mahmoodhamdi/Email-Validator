import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { UpdateAvailable } from "@/components/pwa/UpdateAvailable";
import { PWAProvider } from "@/components/pwa/PWAProvider";

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: query === "(display-mode: standalone)" ? matches : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Mock navigator.onLine
const mockOnlineStatus = (online: boolean) => {
  Object.defineProperty(navigator, "onLine", {
    writable: true,
    value: online,
  });
};

// Mock service worker
const mockServiceWorker = () => {
  Object.defineProperty(navigator, "serviceWorker", {
    writable: true,
    value: {
      ready: Promise.resolve({
        update: jest.fn(),
        waiting: null,
        installing: null,
        addEventListener: jest.fn(),
      }),
      controller: {},
    },
  });
};

describe("PWA Components", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe("InstallPrompt", () => {
    test("does not render when already installed (standalone mode)", () => {
      mockMatchMedia(true);

      render(<InstallPrompt />);

      expect(
        screen.queryByText("Install Email Validator")
      ).not.toBeInTheDocument();
    });

    test("does not render initially when not triggered", () => {
      mockMatchMedia(false);

      render(<InstallPrompt />);

      expect(
        screen.queryByText("Install Email Validator")
      ).not.toBeInTheDocument();
    });

    test("renders when beforeinstallprompt is triggered", async () => {
      mockMatchMedia(false);

      render(<InstallPrompt />);

      // Trigger beforeinstallprompt
      const promptEvent = new Event("beforeinstallprompt");
      Object.assign(promptEvent, {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });

      window.dispatchEvent(promptEvent);

      await waitFor(() => {
        expect(screen.getByText("Install Email Validator")).toBeInTheDocument();
      });
    });

    test("handles dismiss correctly", async () => {
      mockMatchMedia(false);

      render(<InstallPrompt />);

      // Trigger beforeinstallprompt
      const promptEvent = new Event("beforeinstallprompt");
      Object.assign(promptEvent, {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });

      window.dispatchEvent(promptEvent);

      await waitFor(() => {
        expect(screen.getByText("Install Email Validator")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Not now"));

      expect(
        screen.queryByText("Install Email Validator")
      ).not.toBeInTheDocument();
      expect(localStorage.getItem("pwa-install-dismissed")).toBeTruthy();
    });

    test("handles install correctly", async () => {
      mockMatchMedia(false);

      const promptMock = jest.fn();
      const userChoiceMock = Promise.resolve({ outcome: "accepted" as const });

      render(<InstallPrompt />);

      // Trigger beforeinstallprompt
      const promptEvent = new Event("beforeinstallprompt");
      Object.assign(promptEvent, {
        preventDefault: jest.fn(),
        prompt: promptMock,
        userChoice: userChoiceMock,
      });

      window.dispatchEvent(promptEvent);

      await waitFor(() => {
        expect(screen.getByText("Install Email Validator")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Install" }));

      await waitFor(() => {
        expect(promptMock).toHaveBeenCalled();
      });
    });

    test("does not show if dismissed recently", () => {
      mockMatchMedia(false);
      // Set dismissed time to 1 day ago (within 7 day window)
      localStorage.setItem(
        "pwa-install-dismissed",
        (Date.now() - 24 * 60 * 60 * 1000).toString()
      );

      render(<InstallPrompt />);

      // Trigger beforeinstallprompt
      const promptEvent = new Event("beforeinstallprompt");
      Object.assign(promptEvent, {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });

      window.dispatchEvent(promptEvent);

      expect(
        screen.queryByText("Install Email Validator")
      ).not.toBeInTheDocument();
    });
  });

  describe("OfflineIndicator", () => {
    test("shows indicator when offline", () => {
      mockOnlineStatus(false);

      render(<OfflineIndicator />);

      expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    });

    test("hides indicator when online", () => {
      mockOnlineStatus(true);

      render(<OfflineIndicator />);

      expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument();
    });

    test("responds to online event", async () => {
      mockOnlineStatus(false);

      render(<OfflineIndicator />);

      expect(screen.getByText(/You are offline/)).toBeInTheDocument();

      // Simulate going online
      mockOnlineStatus(true);
      window.dispatchEvent(new Event("online"));

      await waitFor(() => {
        expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument();
      });
    });

    test("responds to offline event", async () => {
      mockOnlineStatus(true);

      render(<OfflineIndicator />);

      expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument();

      // Simulate going offline
      window.dispatchEvent(new Event("offline"));

      await waitFor(() => {
        expect(screen.getByText(/You are offline/)).toBeInTheDocument();
      });
    });
  });

  describe("UpdateAvailable", () => {
    test("does not render initially", () => {
      mockServiceWorker();

      render(<UpdateAvailable />);

      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
    });
  });

  describe("PWAProvider", () => {
    test("renders children", () => {
      mockMatchMedia(false);
      mockOnlineStatus(true);

      render(
        <PWAProvider>
          <div data-testid="child">Child content</div>
        </PWAProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    test("renders OfflineIndicator when offline", () => {
      mockMatchMedia(false);
      mockOnlineStatus(false);

      render(
        <PWAProvider>
          <div>Child</div>
        </PWAProvider>
      );

      expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    });
  });
});
