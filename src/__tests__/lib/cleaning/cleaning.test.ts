import {
  cleanEmailList,
  mergeEmailLists,
  findDuplicates,
  groupByDomain,
  isValidEmailSyntax,
} from "@/lib/cleaning";

describe("Email List Cleaning", () => {
  describe("cleanEmailList", () => {
    it("removes duplicates", () => {
      const emails = [
        "test@example.com",
        "test@example.com",
        "other@example.com",
      ];
      const result = cleanEmailList(emails, { removeDuplicates: true });

      expect(result.cleaned).toHaveLength(2);
      expect(result.stats.duplicatesRemoved).toBe(1);
    });

    it("normalizes case", () => {
      const emails = ["TEST@EXAMPLE.COM", "Test@Example.Com"];
      const result = cleanEmailList(emails, {
        normalizeCase: true,
        removeDuplicates: false,
      });

      expect(result.cleaned).toEqual(["test@example.com", "test@example.com"]);
      expect(result.stats.normalized).toBe(2);
    });

    it("removes invalid syntax", () => {
      const emails = [
        "valid@example.com",
        "invalid",
        "@nodomain.com",
        "noat.com",
      ];
      const result = cleanEmailList(emails, { removeInvalidSyntax: true });

      expect(result.cleaned).toEqual(["valid@example.com"]);
      expect(result.stats.invalidRemoved).toBe(3);
    });

    it("removes empty entries", () => {
      const emails = ["test@example.com", "", "  ", "other@example.com"];
      const result = cleanEmailList(emails, { removeEmpty: true });

      expect(result.cleaned).toContain("test@example.com");
      expect(result.cleaned).toContain("other@example.com");
      expect(result.stats.emptyRemoved).toBe(2);
    });

    it("trims whitespace", () => {
      const emails = ["  test@example.com  ", "\tother@example.com\t"];
      const result = cleanEmailList(emails, {
        trimWhitespace: true,
        normalizeCase: false,
      });

      expect(result.cleaned).toEqual(["test@example.com", "other@example.com"]);
    });

    it("sorts alphabetically", () => {
      const emails = ["z@example.com", "a@example.com", "m@example.com"];
      const result = cleanEmailList(emails, {
        sortAlphabetically: true,
        normalizeCase: false,
      });

      expect(result.cleaned).toEqual([
        "a@example.com",
        "m@example.com",
        "z@example.com",
      ]);
    });

    it("groups by domain", () => {
      const emails = [
        "b@yahoo.com",
        "a@gmail.com",
        "c@gmail.com",
        "d@yahoo.com",
      ];
      const result = cleanEmailList(emails, {
        groupByDomain: true,
        sortAlphabetically: false,
        normalizeCase: false,
      });

      // Should be sorted by domain first
      const gmailIndex = result.cleaned.findIndex((e) =>
        e.includes("gmail.com")
      );
      const yahooIndex = result.cleaned.findIndex((e) =>
        e.includes("yahoo.com")
      );

      // Gmail comes before Yahoo alphabetically
      expect(gmailIndex).toBeLessThan(yahooIndex);
    });

    it("applies all default options", () => {
      const emails = [
        "TEST@example.com",
        "  test@example.com  ",
        "",
        "invalid",
        "valid@test.com",
      ];
      const result = cleanEmailList(emails);

      // Should be normalized, trimmed, deduplicated, and invalid removed
      expect(result.cleaned).toHaveLength(2);
      expect(result.cleaned).toContain("test@example.com");
      expect(result.cleaned).toContain("valid@test.com");
    });

    it("records changes correctly", () => {
      const emails = ["TEST@example.com", "test@example.com"];
      const result = cleanEmailList(emails);

      const normalizedChanges = result.changes.filter(
        (c) => c.type === "normalized"
      );
      const duplicateChanges = result.changes.filter(
        (c) => c.type === "duplicate_removed"
      );

      expect(normalizedChanges.length).toBeGreaterThan(0);
      expect(duplicateChanges.length).toBe(1);
    });

    it("returns correct stats", () => {
      const emails = [
        "a@test.com",
        "a@test.com",
        "invalid",
        "",
        "b@test.com",
      ];
      const result = cleanEmailList(emails);

      expect(result.stats.originalCount).toBe(5);
      expect(result.stats.cleanedCount).toBe(2);
      expect(result.stats.duplicatesRemoved).toBe(1);
      expect(result.stats.invalidRemoved).toBe(1);
      expect(result.stats.emptyRemoved).toBe(1);
    });
  });

  describe("mergeEmailLists", () => {
    it("merges multiple lists", () => {
      const lists = [
        ["a@example.com", "b@example.com"],
        ["c@example.com", "d@example.com"],
      ];

      const result = mergeEmailLists(lists);

      expect(result.merged).toHaveLength(4);
      expect(result.stats.listsCount).toBe(2);
    });

    it("removes duplicates across lists", () => {
      const lists = [
        ["a@example.com", "b@example.com"],
        ["b@example.com", "c@example.com"],
      ];

      const result = mergeEmailLists(lists);

      expect(result.merged).toHaveLength(3);
      expect(result.stats.duplicatesRemoved).toBe(1);
    });

    it("handles empty lists", () => {
      const lists = [["a@example.com"], [], ["b@example.com"]];

      const result = mergeEmailLists(lists);

      expect(result.merged).toHaveLength(2);
      expect(result.stats.listsCount).toBe(3);
    });

    it("normalizes emails during merge", () => {
      const lists = [["TEST@example.com"], ["test@example.com"]];

      const result = mergeEmailLists(lists);

      expect(result.merged).toHaveLength(1);
      expect(result.merged[0]).toBe("test@example.com");
    });

    it("calculates stats correctly", () => {
      const lists = [
        ["a@test.com", "b@test.com"],
        ["b@test.com", "c@test.com"],
        ["c@test.com", "d@test.com"],
      ];

      const result = mergeEmailLists(lists);

      expect(result.stats.totalOriginal).toBe(6);
      expect(result.stats.totalMerged).toBe(4);
      expect(result.stats.duplicatesRemoved).toBe(2);
      expect(result.stats.listsCount).toBe(3);
    });
  });

  describe("findDuplicates", () => {
    it("finds duplicate emails", () => {
      const emails = ["a@test.com", "b@test.com", "a@test.com", "a@test.com"];
      const duplicates = findDuplicates(emails);

      expect(duplicates.get("a@test.com")).toBe(3);
      expect(duplicates.has("b@test.com")).toBe(false);
    });

    it("handles case insensitivity", () => {
      const emails = ["TEST@example.com", "test@example.com"];
      const duplicates = findDuplicates(emails);

      expect(duplicates.get("test@example.com")).toBe(2);
    });

    it("handles whitespace", () => {
      const emails = ["  test@example.com", "test@example.com  "];
      const duplicates = findDuplicates(emails);

      expect(duplicates.get("test@example.com")).toBe(2);
    });

    it("returns empty map for unique emails", () => {
      const emails = ["a@test.com", "b@test.com", "c@test.com"];
      const duplicates = findDuplicates(emails);

      expect(duplicates.size).toBe(0);
    });
  });

  describe("groupByDomain", () => {
    it("groups emails by domain", () => {
      const emails = ["a@gmail.com", "b@yahoo.com", "c@gmail.com"];
      const groups = groupByDomain(emails);

      expect(groups.get("gmail.com")).toHaveLength(2);
      expect(groups.get("yahoo.com")).toHaveLength(1);
    });

    it("handles different case domains", () => {
      const emails = ["a@Gmail.com", "b@GMAIL.COM", "c@gmail.com"];
      const groups = groupByDomain(emails);

      expect(groups.get("gmail.com")).toHaveLength(3);
    });

    it("handles emails without domain", () => {
      const emails = ["nodomain"];
      const groups = groupByDomain(emails);

      expect(groups.get("unknown")).toHaveLength(1);
    });

    it("preserves original email format", () => {
      const emails = ["User@Gmail.com"];
      const groups = groupByDomain(emails);

      expect(groups.get("gmail.com")?.[0]).toBe("User@Gmail.com");
    });
  });

  describe("isValidEmailSyntax", () => {
    it("validates correct emails", () => {
      expect(isValidEmailSyntax("test@example.com")).toBe(true);
      expect(isValidEmailSyntax("user.name@domain.co.uk")).toBe(true);
      expect(isValidEmailSyntax("user+tag@example.org")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(isValidEmailSyntax("invalid")).toBe(false);
      expect(isValidEmailSyntax("@nodomain.com")).toBe(false);
      expect(isValidEmailSyntax("noat.com")).toBe(false);
      expect(isValidEmailSyntax("missing@tld")).toBe(false);
    });

    it("handles whitespace", () => {
      expect(isValidEmailSyntax("  test@example.com  ")).toBe(true);
    });

    it("rejects empty strings", () => {
      expect(isValidEmailSyntax("")).toBe(false);
      expect(isValidEmailSyntax("   ")).toBe(false);
    });
  });
});
