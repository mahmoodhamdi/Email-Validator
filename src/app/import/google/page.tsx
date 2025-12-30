"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GoogleSignIn } from "@/components/google/GoogleSignIn";
import { ContactSelector } from "@/components/google/ContactSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParsedContact } from "@/lib/google/types";
import { Loader2, AlertCircle } from "lucide-react";

export default function GoogleImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (hasFetched) {
      return;
    }

    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const response = await fetch("/api/google/contacts");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch contacts");
      }

      setContacts(data.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [hasFetched]);

  useEffect(() => {
    if (session?.accessToken && contacts.length === 0 && !hasFetched) {
      fetchContacts();
    }
  }, [session, contacts.length, hasFetched, fetchContacts]);

  const handleImport = (emails: string[]) => {
    // Store in session storage and redirect to bulk validation
    sessionStorage.setItem("importedEmails", JSON.stringify(emails));
    router.push("/bulk?source=google");
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import from Google Contacts</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Google account to import contacts for validation
        </p>
      </div>

      <GoogleSignIn />

      {session && (
        <Card>
          <CardHeader>
            <CardTitle>Your Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="space-y-4 py-8">
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
                <p className="text-center text-muted-foreground">
                  Loading contacts...
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && contacts.length > 0 && (
              <ContactSelector contacts={contacts} onImport={handleImport} />
            )}

            {!loading && !error && contacts.length === 0 && hasFetched && (
              <p className="text-center text-muted-foreground py-8">
                No contacts with email addresses found
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
