import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { fetchAllGoogleContacts } from "@/lib/google/contacts";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const contacts = await fetchAllGoogleContacts(session.accessToken);

    return NextResponse.json({
      success: true,
      contacts,
      count: contacts.length,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch contacts",
      },
      { status: 500 }
    );
  }
}
