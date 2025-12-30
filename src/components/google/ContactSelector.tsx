"use client";

import { useState, useMemo } from "react";
import { ParsedContact } from "@/lib/google/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, Building, CheckSquare, Square } from "lucide-react";

interface ContactSelectorProps {
  contacts: ParsedContact[];
  onImport: (emails: string[]) => void;
  isImporting?: boolean;
}

export function ContactSelector({
  contacts,
  onImport,
  isImporting,
}: ContactSelectorProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredContacts = useMemo(() => {
    if (!search) {
      return contacts;
    }

    const searchLower = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower) ||
        c.organization?.toLowerCase().includes(searchLower)
    );
  }, [contacts, search]);

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const handleImport = () => {
    const selectedEmails = contacts
      .filter((c) => selectedIds.has(c.id))
      .map((c) => c.email);
    onImport(selectedEmails);
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={toggleAll}>
          {selectedIds.size === filteredContacts.length ? (
            <Square className="h-4 w-4 mr-2" />
          ) : (
            <CheckSquare className="h-4 w-4 mr-2" />
          )}
          {selectedIds.size === filteredContacts.length
            ? "Deselect All"
            : "Select All"}
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-2 text-sm">
        <Badge variant="outline">{contacts.length} contacts</Badge>
        <Badge variant="secondary">{selectedIds.size} selected</Badge>
        {search && (
          <Badge variant="outline">{filteredContacts.length} matching</Badge>
        )}
      </div>

      {/* Contact List */}
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-2 space-y-1">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted ${
                selectedIds.has(contact.id) ? "bg-muted" : ""
              }`}
              onClick={() => toggleContact(contact.id)}
            >
              <Checkbox
                checked={selectedIds.has(contact.id)}
                onCheckedChange={() => toggleContact(contact.id)}
              />

              {contact.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={contact.photo}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{contact.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {contact.email}
                </p>
              </div>

              {contact.organization && (
                <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                  <Building className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">
                    {contact.organization}
                  </span>
                </div>
              )}

              {contact.type && (
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  {contact.type}
                </Badge>
              )}
            </div>
          ))}

          {filteredContacts.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {search ? "No contacts match your search" : "No contacts found"}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Import Button */}
      <Button
        onClick={handleImport}
        disabled={selectedIds.size === 0 || isImporting}
        className="w-full"
      >
        {isImporting
          ? "Importing..."
          : `Import ${selectedIds.size} Contact${selectedIds.size !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
