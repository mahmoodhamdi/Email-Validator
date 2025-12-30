import {
  filterContactsWithEmail,
  groupContactsByDomain,
} from "@/lib/google/contacts";
import { ParsedContact } from "@/lib/google/types";

describe("Google Contacts", () => {
  const mockContacts: ParsedContact[] = [
    { id: "1", name: "John Doe", email: "john@gmail.com" },
    { id: "2", name: "Jane Smith", email: "jane@yahoo.com" },
    { id: "3", name: "Bob Wilson", email: "bob@gmail.com" },
    { id: "4", name: "Invalid User", email: "" },
    { id: "5", name: "No Email", email: "noemail" },
  ];

  describe("filterContactsWithEmail", () => {
    it("filters contacts with valid emails", () => {
      const result = filterContactsWithEmail(mockContacts);

      expect(result).toHaveLength(3);
      expect(result.every((c) => c.email.includes("@"))).toBe(true);
    });

    it("removes contacts without email", () => {
      const result = filterContactsWithEmail(mockContacts);

      expect(result.find((c) => c.name === "Invalid User")).toBeUndefined();
    });

    it("removes contacts with invalid email format", () => {
      const result = filterContactsWithEmail(mockContacts);

      expect(result.find((c) => c.name === "No Email")).toBeUndefined();
    });

    it("returns empty array for empty input", () => {
      const result = filterContactsWithEmail([]);

      expect(result).toHaveLength(0);
    });

    it("preserves contact properties", () => {
      const contacts: ParsedContact[] = [
        {
          id: "1",
          name: "John",
          email: "john@test.com",
          organization: "Acme Corp",
          photo: "http://photo.url",
          type: "Work",
        },
      ];

      const result = filterContactsWithEmail(contacts);

      expect(result[0]).toEqual(contacts[0]);
    });
  });

  describe("groupContactsByDomain", () => {
    it("groups contacts by email domain", () => {
      const filtered = filterContactsWithEmail(mockContacts);
      const groups = groupContactsByDomain(filtered);

      expect(groups.get("gmail.com")).toHaveLength(2);
      expect(groups.get("yahoo.com")).toHaveLength(1);
    });

    it("handles multiple domains correctly", () => {
      const contacts: ParsedContact[] = [
        { id: "1", name: "A", email: "a@domain1.com" },
        { id: "2", name: "B", email: "b@domain2.com" },
        { id: "3", name: "C", email: "c@domain1.com" },
        { id: "4", name: "D", email: "d@domain3.com" },
      ];

      const groups = groupContactsByDomain(contacts);

      expect(groups.size).toBe(3);
      expect(groups.get("domain1.com")).toHaveLength(2);
      expect(groups.get("domain2.com")).toHaveLength(1);
      expect(groups.get("domain3.com")).toHaveLength(1);
    });

    it("handles contacts without @ in email", () => {
      const contacts: ParsedContact[] = [
        { id: "1", name: "Test", email: "nodomain" },
      ];

      const groups = groupContactsByDomain(contacts);

      expect(groups.get("unknown")).toHaveLength(1);
    });

    it("returns empty map for empty input", () => {
      const groups = groupContactsByDomain([]);

      expect(groups.size).toBe(0);
    });

    it("preserves contact order within groups", () => {
      const contacts: ParsedContact[] = [
        { id: "1", name: "Alice", email: "alice@test.com" },
        { id: "2", name: "Bob", email: "bob@test.com" },
        { id: "3", name: "Charlie", email: "charlie@test.com" },
      ];

      const groups = groupContactsByDomain(contacts);
      const testGroup = groups.get("test.com");

      expect(testGroup?.[0].name).toBe("Alice");
      expect(testGroup?.[1].name).toBe("Bob");
      expect(testGroup?.[2].name).toBe("Charlie");
    });
  });
});
