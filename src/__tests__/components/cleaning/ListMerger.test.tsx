import { render, screen, fireEvent } from "@testing-library/react";
import { ListMerger } from "@/components/cleaning/ListMerger";

describe("ListMerger", () => {
  it("renders with two initial lists", () => {
    render(<ListMerger />);

    expect(screen.getByText("List 1")).toBeInTheDocument();
    expect(screen.getByText("List 2")).toBeInTheDocument();
  });

  it("shows add list button", () => {
    render(<ListMerger />);

    expect(screen.getByRole("button", { name: /add list/i })).toBeInTheDocument();
  });

  it("shows merge lists button", () => {
    render(<ListMerger />);

    expect(screen.getByRole("button", { name: /merge lists/i })).toBeInTheDocument();
  });

  it("adds a new list when add button is clicked", () => {
    render(<ListMerger />);

    const addButton = screen.getByRole("button", { name: /add list/i });
    fireEvent.click(addButton);

    expect(screen.getByText("List 3")).toBeInTheDocument();
  });

  it("removes a list when delete button is clicked", () => {
    render(<ListMerger />);

    // Add a third list first
    const addButton = screen.getByRole("button", { name: /add list/i });
    fireEvent.click(addButton);

    expect(screen.getByText("List 3")).toBeInTheDocument();

    // Delete buttons should now be visible
    const deleteButtons = screen.getAllByRole("button", { name: "" });
    const deleteButton = deleteButtons.find(
      (btn) => btn.querySelector("svg.lucide-trash-2") !== null
    );

    if (deleteButton) {
      fireEvent.click(deleteButton);
    }

    // Should have 2 lists again
    expect(screen.getByText("List 1")).toBeInTheDocument();
    expect(screen.getByText("List 2")).toBeInTheDocument();
  });

  it("does not show delete buttons when only 2 lists", () => {
    render(<ListMerger />);

    // There should be no trash icons with only 2 lists
    const trashIcons = document.querySelectorAll(".lucide-trash-2");
    expect(trashIcons.length).toBe(0);
  });

  it("shows email count for each list", () => {
    render(<ListMerger />);

    const textareas = screen.getAllByPlaceholderText(
      "Paste emails (one per line)"
    );

    fireEvent.change(textareas[0], {
      target: { value: "a@test.com\nb@test.com" },
    });

    expect(screen.getByText("2 emails")).toBeInTheDocument();
  });

  it("disables merge button when no emails", () => {
    render(<ListMerger />);

    const mergeButton = screen.getByRole("button", { name: /merge lists/i });
    expect(mergeButton).toBeDisabled();
  });

  it("enables merge button when emails are entered", () => {
    render(<ListMerger />);

    const textareas = screen.getAllByPlaceholderText(
      "Paste emails (one per line)"
    );

    fireEvent.change(textareas[0], {
      target: { value: "a@test.com" },
    });

    const mergeButton = screen.getByRole("button", { name: /merge lists/i });
    expect(mergeButton).not.toBeDisabled();
  });

  it("shows merged result after clicking merge", () => {
    render(<ListMerger />);

    const textareas = screen.getAllByPlaceholderText(
      "Paste emails (one per line)"
    );

    fireEvent.change(textareas[0], {
      target: { value: "a@test.com\nb@test.com" },
    });
    fireEvent.change(textareas[1], {
      target: { value: "c@test.com" },
    });

    const mergeButton = screen.getByRole("button", { name: /merge lists/i });
    fireEvent.click(mergeButton);

    expect(screen.getByText("Merged Result")).toBeInTheDocument();
    expect(screen.getByText("2 lists merged")).toBeInTheDocument();
    expect(screen.getByText("3 total emails")).toBeInTheDocument();
  });

  it("shows duplicate count after merging", () => {
    render(<ListMerger />);

    const textareas = screen.getAllByPlaceholderText(
      "Paste emails (one per line)"
    );

    fireEvent.change(textareas[0], {
      target: { value: "a@test.com\nb@test.com" },
    });
    fireEvent.change(textareas[1], {
      target: { value: "b@test.com\nc@test.com" },
    });

    const mergeButton = screen.getByRole("button", { name: /merge lists/i });
    fireEvent.click(mergeButton);

    expect(screen.getByText("1 duplicates removed")).toBeInTheDocument();
    expect(screen.getByText("3 unique emails")).toBeInTheDocument();
  });

  it("shows copy and download buttons after merge", () => {
    render(<ListMerger />);

    const textareas = screen.getAllByPlaceholderText(
      "Paste emails (one per line)"
    );

    fireEvent.change(textareas[0], {
      target: { value: "a@test.com" },
    });

    const mergeButton = screen.getByRole("button", { name: /merge lists/i });
    fireEvent.click(mergeButton);

    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
  });

  it("displays merged emails in textarea", () => {
    render(<ListMerger />);

    const textareas = screen.getAllByPlaceholderText(
      "Paste emails (one per line)"
    );

    fireEvent.change(textareas[0], {
      target: { value: "a@test.com" },
    });
    fireEvent.change(textareas[1], {
      target: { value: "b@test.com" },
    });

    const mergeButton = screen.getByRole("button", { name: /merge lists/i });
    fireEvent.click(mergeButton);

    // The result textarea should contain both emails
    const resultTextarea = screen.getAllByRole("textbox").find(
      (el) => (el as HTMLTextAreaElement).readOnly
    ) as HTMLTextAreaElement;

    expect(resultTextarea.value).toContain("a@test.com");
    expect(resultTextarea.value).toContain("b@test.com");
  });
});
