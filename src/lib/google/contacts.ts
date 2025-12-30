import { GoogleContact, ContactsResponse, ParsedContact } from "./types";

const PEOPLE_API_BASE = "https://people.googleapis.com/v1";

/**
 * Fetch contacts from Google People API
 */
export async function fetchGoogleContacts(
  accessToken: string,
  pageToken?: string
): Promise<{
  contacts: ParsedContact[];
  nextPageToken?: string;
  totalItems: number;
}> {
  const params = new URLSearchParams({
    personFields: "names,emailAddresses,photos,organizations",
    pageSize: "100",
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const response = await fetch(
    `${PEOPLE_API_BASE}/people/me/connections?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch contacts");
  }

  const data: ContactsResponse = await response.json();
  const contacts = parseContacts(data.connections || []);

  return {
    contacts,
    nextPageToken: data.nextPageToken,
    totalItems: data.totalItems || 0,
  };
}

/**
 * Fetch all contacts (handles pagination)
 */
export async function fetchAllGoogleContacts(
  accessToken: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<ParsedContact[]> {
  const allContacts: ParsedContact[] = [];
  let pageToken: string | undefined;
  let totalItems = 0;

  do {
    const result = await fetchGoogleContacts(accessToken, pageToken);

    allContacts.push(...result.contacts);
    pageToken = result.nextPageToken;
    totalItems = result.totalItems || allContacts.length;

    onProgress?.(allContacts.length, totalItems);
  } while (pageToken);

  return allContacts;
}

/**
 * Parse raw Google contacts to simplified format
 */
function parseContacts(contacts: GoogleContact[]): ParsedContact[] {
  const parsed: ParsedContact[] = [];

  for (const contact of contacts) {
    const emails = contact.emailAddresses || [];

    for (const email of emails) {
      if (!email.value) {
        continue;
      }

      parsed.push({
        id: `${contact.resourceName}_${email.value}`,
        name: contact.names?.[0]?.displayName || email.value.split("@")[0],
        email: email.value.toLowerCase(),
        photo: contact.photos?.find((p) => !p.default)?.url,
        organization: contact.organizations?.[0]?.name,
        type: email.formattedType,
      });
    }
  }

  return parsed;
}

/**
 * Filter contacts that have email addresses
 */
export function filterContactsWithEmail(
  contacts: ParsedContact[]
): ParsedContact[] {
  return contacts.filter((c) => c.email && c.email.includes("@"));
}

/**
 * Group contacts by domain
 */
export function groupContactsByDomain(
  contacts: ParsedContact[]
): Map<string, ParsedContact[]> {
  const groups = new Map<string, ParsedContact[]>();

  for (const contact of contacts) {
    const domain = contact.email.split("@")[1] || "unknown";

    if (!groups.has(domain)) {
      groups.set(domain, []);
    }
    groups.get(domain)!.push(contact);
  }

  return groups;
}
