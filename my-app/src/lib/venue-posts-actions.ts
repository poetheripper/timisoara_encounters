"use server";

import { auth0 } from "@/lib/auth0";
import { publicRole } from "@/lib/accounts";
import { cleanVenuePost, type NewVenuePost, type VenuePost } from "@/lib/venue-posts";
import { createClient } from "@/utils/supabase/server";

const NOT_ALLOWED = { ok: false, error: "Only venue accounts can do this." } as const;
const SAVE_FAILED = { ok: false, error: "Could not save. Please try again." } as const;

// Server actions can be called directly, so each one checks the session and the role itself
// and only ever touches the posts of the logged-in venue.
async function currentVenueId() {
  const session = await auth0.getSession();
  const userId = session?.user?.sub;
  if (!userId) return null;

  const supabase = createClient();
  const { data } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  return publicRole(data?.role) === "venue" ? userId : null;
}

export async function addVenuePost(
  raw: NewVenuePost,
): Promise<{ ok: true; post: VenuePost } | { ok: false; error: string }> {
  const venueId = await currentVenueId();
  if (!venueId) return NOT_ALLOWED;

  const cleaned = cleanVenuePost(raw);
  if (!cleaned.ok) return cleaned;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("venue_posts")
    .insert({ venue_id: venueId, ...cleaned.post })
    .select("id")
    .single();
  if (error) {
    console.error("addVenuePost error:", error.message);
    return SAVE_FAILED;
  }
  return { ok: true, post: { id: data.id, ...cleaned.post } };
}

export async function deleteVenuePost(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const venueId = await currentVenueId();
  if (!venueId) return NOT_ALLOWED;

  const supabase = createClient();
  const { error } = await supabase
    .from("venue_posts")
    .delete()
    .eq("id", String(id))
    .eq("venue_id", venueId);
  if (error) {
    console.error("deleteVenuePost error:", error.message);
    return { ok: false, error: "Could not delete. Please try again." };
  }
  return { ok: true };
}
