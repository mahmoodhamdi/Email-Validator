import { render, screen, fireEvent } from "@testing-library/react";
import { ContactSelector } from "@/components/google/ContactSelector";
import { ParsedContact } from "@/lib/google/types";

const mockContacts: ParsedContact[] = [
  { id: "1", name: "John Doe", email: "john@gmail.com" },
  { id: "2", name: "Jane Smith", email: "jane@yahoo.com", organization: "Acme" },
  { id: "3", name: "Bob Wilson", email: "bob@gmail.com", type: "Work" },
];

describe("ContactSelector", () => {
  it("renders contact list", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Wilson")).toBeInTheDocument();
  });

  it("shows email addresses", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    expect(screen.getByText("john@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("jane@yahoo.com")).toBeInTheDocument();
    expect(screen.getByText("bob@gmail.com")).toBeInTheDocument();
  });

  it("shows contact count", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    expect(screen.getByText("3 contacts")).toBeInTheDocument();
  });

  it("shows initial selected count as 0", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  it("updates selected count when contact is clicked", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    const johnRow = screen.getByText("John Doe").closest("div[class*='cursor-pointer']");
    if (johnRow) {
      fireEvent.click(johnRow);
    }

    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("has search input", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    expect(screen.getByPlaceholderText("Search contacts...")).toBeInTheDocument();
  });

  it("filters contacts by search", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    const searchInput = screen.getByPlaceholderText("Search contacts...");
    fireEvent.change(searchInput, { target: { value: "john" } });

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  it("shows matching count when searching", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    const searchInput = screen.getByPlaceholderText("Search contacts...");
    fireEvent.change(searchInput, { target: { value: "gmail" } });

    expect(screen.getByText("2 matching")).toBeInTheDocument();
  });

  it("has select all button", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument();
  });

  it("selects all contacts when select all is clicked", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    const selectAllButton = screen.getByRole("button", { name: /select all/i });
    fireEvent.click(selectAllButton);

    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("changes to deselect all after selecting all", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    const selectAllButton = screen.getByRole("button", { name: /select all/i });
    fireEvent.click(selectAllButton);

    expect(screen.getByRole("button", { name: /deselect all/i })).toBeInTheDocument();
  });

  it("disables import button when no contacts selected", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    const importButton = screen.getByRole("button", { name: /import 0 contacts/i });
    expect(importButton).toBeDisabled();
  });

  it("enables import button when contacts are selected", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    const johnRow = screen.getByText("John Doe").closest("div[class*='cursor-pointer']");
    if (johnRow) {
      fireEvent.click(johnRow);
    }

    const importButton = screen.getByRole("button", { name: /import 1 contact$/i });
    expect(importButton).not.toBeDisabled();
  });

  it("calls onImport with selected emails", () => {
    const mockOnImport = jest.fn();
    render(<ContactSelector contacts={mockContacts} onImport={mockOnImport} />);

    const johnRow = screen.getByText("John Doe").closest("div[class*='cursor-pointer']");
    const janeRow = screen.getByText("Jane Smith").closest("div[class*='cursor-pointer']");

    if (johnRow) {
      fireEvent.click(johnRow);
    }
    if (janeRow) {
      fireEvent.click(janeRow);
    }

    const importButton = screen.getByRole("button", { name: /import 2 contacts/i });
    fireEvent.click(importButton);

    expect(mockOnImport).toHaveBeenCalledWith(["john@gmail.com", "jane@yahoo.com"]);
  });

  it("shows importing state when isImporting is true", () => {
    render(
      <ContactSelector
        contacts={mockContacts}
        onImport={() => {}}
        isImporting={true}
      />
    );

    expect(screen.getByText("Importing...")).toBeInTheDocument();
  });

  it("shows organization when available", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("shows type badge when available", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("shows no contacts message when list is empty", () => {
    render(<ContactSelector contacts={[]} onImport={() => {}} />);

    expect(screen.getByText("No contacts found")).toBeInTheDocument();
  });

  it("shows no match message when search has no results", () => {
    render(<ContactSelector contacts={mockContacts} onImport={() => {}} />);

    const searchInput = screen.getByPlaceholderText("Search contacts...");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(screen.getByText("No contacts match your search")).toBeInTheDocument();
  });
});
