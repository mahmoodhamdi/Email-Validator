import { render, screen } from "@testing-library/react";
import { ShortcutIndicator } from "@/components/shortcuts/ShortcutIndicator";

describe("ShortcutIndicator", () => {
  it("should render shortcut text", () => {
    render(<ShortcutIndicator shortcut="Ctrl+K" />);
    expect(screen.getByText("Ctrl+K")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<ShortcutIndicator shortcut="⌘K" className="custom-class" />);
    const badge = screen.getByText("⌘K");
    expect(badge).toHaveClass("custom-class");
  });

  it("should render as a badge with outline variant", () => {
    render(<ShortcutIndicator shortcut="Esc" />);
    const badge = screen.getByText("Esc");
    expect(badge).toHaveClass("text-xs");
    expect(badge).toHaveClass("font-mono");
  });

  it("should render special characters correctly", () => {
    render(<ShortcutIndicator shortcut="⌘+⇧+K" />);
    expect(screen.getByText("⌘+⇧+K")).toBeInTheDocument();
  });

  it("should render single key shortcuts", () => {
    render(<ShortcutIndicator shortcut="/" />);
    expect(screen.getByText("/")).toBeInTheDocument();
  });
});
