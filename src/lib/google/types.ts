export interface GoogleContact {
  resourceName: string;
  etag: string;
  names?: {
    displayName?: string;
    familyName?: string;
    givenName?: string;
  }[];
  emailAddresses?: {
    value: string;
    type?: string;
    formattedType?: string;
  }[];
  photos?: {
    url: string;
    default?: boolean;
  }[];
  organizations?: {
    name?: string;
    title?: string;
  }[];
}

export interface ContactsResponse {
  connections?: GoogleContact[];
  totalPeople?: number;
  totalItems?: number;
  nextPageToken?: string;
}

export interface ParsedContact {
  id: string;
  name: string;
  email: string;
  photo?: string;
  organization?: string;
  type?: string;
}

export interface ImportSelection {
  contacts: ParsedContact[];
  selectedIds: Set<string>;
}
