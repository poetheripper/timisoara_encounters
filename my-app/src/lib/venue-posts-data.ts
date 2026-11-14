import { isVenuePostKind, type VenuePost } from "@/lib/venue-posts";
import { createClient } from "@/utils/supabase/server";

/** All events and open calls of one venue. `error` is set while supabase/venue_posts.sql has not been run. */
export async function loadVenuePosts(venueId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("venue_posts")
    .select("id, kind, title, description, date")
    .eq("venue_id", venueId)
    .order("date");
  if (error) console.error("loadVenuePosts error:", error.message);

  const posts: VenuePost[] = (data ?? []).filter((row) => isVenuePostKind(row.kind));
  return { posts, error: Boolean(error) };
}
