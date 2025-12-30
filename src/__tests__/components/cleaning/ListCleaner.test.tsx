import { render, screen, fireEvent } from "@testing-library/react";
import { ListCleaner } from "@/components/cleaning/ListCleaner";

describe("ListCleaner", () => {
  it("renders with initial empty state", () => {
    render(<ListCleaner />);

    expect(screen.getByText("Email List")).toBeInTheDocument();
    expect(screen.getByText("Cleaning Options")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Paste emails here (one per line)")
    ).toBeInTheDocument();
  });

  it("renders with initial emails", () => {
    const initialEmails = ["test@example.com", "other@example.com"];
    render(<ListCleaner initialEmails={initialEmails} />);

    const textarea = screen.getByPlaceholderText(
      "Paste emails here (one per line)"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("test@example.com\nother@example.com");
  });

  it("shows email count", () => {
    render(<ListCleaner />);

    const textarea = screen.getByPlaceholderText(
      "Paste emails here (one per line)"
    );
    fireEvent.change(textarea, {
      target: { value: "a@test.com\nb@test.com\nc@test.com" },
    });

    expect(screen.getByText("3 emails")).toBeInTheDocument();
  });

  it("shows duplicate warning when duplicates exist", () => {
    render(<ListCleaner />);

    const textarea = screen.getByPlaceholderText(
      "Paste emails here (one per line)"
    );
    fireEvent.change(textarea, {
      target: { value: "test@example.com\ntest@example.com\nother@example.com" },
    });

    expect(screen.getByText("1 duplicates found")).toBeInTheDocument();
  });

  it("shows all cleaning options", () => {
    render(<ListCleaner />);

    expect(screen.getByText("Remove Duplicates")).toBeInTheDocument();
    expect(screen.getByText("Normalize Case")).toBeInTheDocument();
    expect(screen.getByText("Trim Whitespace")).toBeInTheDocument();
    expect(screen.getByText("Remove Invalid")).toBeInTheDocument();
    expect(screen.getByText("Remove Empty")).toBeInTheDocument();
    expect(screen.getByText("Sort A-Z")).toBeInTheDocument();
    expect(screen.getByText("Group by Domain")).toBeInTheDocument();
  });

  it("has clean list button", () => {
    render(<ListCleaner />);

    expect(screen.getByRole("button", { name: /clean list/i })).toBeInTheDocument();
  });

  it("disables clean button when no emails", () => {
    render(<ListCleaner />);

    const cleanButton = screen.getByRole("button", { name: /clean list/i });
    expect(cleanButton).toBeDisabled();
  });

  it("enables clean button when emails are entered", () => {
    render(<ListCleaner />);

    const textarea = screen.getByPlaceholderText(
      "Paste emails here (one per line)"
    );
    fireEvent.change(textarea, {
      target: { value: "test@example.com" },
    });

    const cleanButton = screen.getByRole("button", { name: /clean list/i });
    expect(cleanButton).not.toBeDisabled();
  });

  it("shows results after cleaning", () => {
    render(<ListCleaner />);

    const textarea = screen.getByPlaceholderText(
      "Paste emails here (one per line)"
    );
    fireEvent.change(textarea, {
      target: { value: "TEST@example.com\ntest@example.com\nother@test.com" },
    });

    const cleanButton = screen.getByRole("button", { name: /clean list/i });
    fireEvent.click(cleanButton);

    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("After Cleaning")).toBeInTheDocument();
    expect(screen.getByText("Duplicates Removed")).toBeInTheDocument();
  });

  it("shows copy and download buttons after cleaning", () => {
    render(<ListCleaner />);

    const textarea = screen.getByPlaceholderText(
      "Paste emails here (one per line)"
    );
    fireEvent.change(textarea, {
      target: { value: "test@example.com" },
    });

    const cleanButton = screen.getByRole("button", { name: /clean list/i });
    fireEvent.click(cleanButton);

    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
  });

  it("calls onCleaned callback when apply is clicked", () => {
    const onCleaned = jest.fn();
    render(<ListCleaner onCleaned={onCleaned} />);

    const textarea = screen.getByPlaceholderText(
      "Paste emails here (one per line)"
    );
    fireEvent.change(textarea, {
      target: { value: "test@example.com" },
    });

    const cleanButton = screen.getByRole("button", { name: /clean list/i });
    fireEvent.click(cleanButton);

    const applyButton = screen.getByRole("button", { name: /apply changes/i });
    fireEvent.click(applyButton);

    expect(onCleaned).toHaveBeenCalledWith(["test@example.com"]);
  });

  it("shows tabs for preview, changes, and domains", () => {
    render(<ListCleaner />);

    const textarea = screen.getByPlaceholderText(
      "Paste emails here (one per line)"
    );
    fireEvent.change(textarea, {
      target: { value: "test@example.com" },
    });

    const cleanButton = screen.getByRole("button", { name: /clean list/i });
    fireEvent.click(cleanButton);

    expect(screen.getByRole("tab", { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /changes/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /by domain/i })).toBeInTheDocument();
  });
});
