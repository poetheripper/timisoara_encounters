import { auth0 } from "@/lib/auth0";
import { publicRole } from "@/lib/accounts";
import { createClient } from "@/utils/supabase/server";

export const NOT_A_VENUE = { ok: false, error: "Only venue accounts can do this." } as const;
export const SAVE_FAILED = { ok: false, error: "Could not save. Please try again." } as const;

/**
 * The id of the logged-in account when it is a venue, otherwise null.
 * Server actions can be called directly, so each venue action checks this itself
 * and only ever touches the data of the logged-in venue.
 */
export async function currentVenueId() {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  if (!userId) return null;

  const supabase = createClient();
  const { data } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  return publicRole(data?.role) === "venue" ? userId : null;
}
