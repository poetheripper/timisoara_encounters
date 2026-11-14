"use server";

import { auth0 } from "@/lib/auth0";
import { cleanContactLinks, type ContactLink } from "@/lib/contact";
import { createClient } from "@/utils/supabase/server";

export type ContactResult = { ok: true; links: ContactLink[] } | { ok: false; error: string };

/** Replaces the contact links of the logged-in account. Returns them as stored (cleaned up). */
export async function saveContactLinks(raw: ContactLink[]): Promise<ContactResult> {
  // Server actions can be called directly, so the session is checked here
  // and only the row of the logged-in account is ever touched.
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  if (!userId) return { ok: false, error: "You need to be logged in." };

  const cleaned = cleanContactLinks(raw);
  if (!cleaned.ok) return { ok: false, error: cleaned.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ contact_links: cleaned.links })
    .eq("id", userId);
  if (error) {
    console.error("saveContactLinks error:", error.message);
    return { ok: false, error: "Could not save. Please try again." };
  }
  return { ok: true, links: cleaned.links };
}
