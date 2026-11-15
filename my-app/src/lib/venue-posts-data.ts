import { isVenuePostKind, type VenuePost } from "@/lib/venue-posts";
import { createClient } from "@/utils/supabase/server";

/** All events and open calls of one venue. `error` is set while the SQL files in supabase/ have not been run. */
export async function loadVenuePosts(venueId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("venue_posts")
    .select("id, kind, title, description, date, link, banner_url")
    .eq("venue_id", venueId)
    .order("date");
  if (error) console.error("loadVenuePosts error:", error.message);

  const posts: VenuePost[] = [];
  for (const row of data ?? []) {
    if (!isVenuePostKind(row.kind)) continue;
    posts.push({
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.description,
      date: row.date,
      link: row.link ?? null,
      bannerUrl: row.banner_url ?? null,
    });
  }
  return { posts, error: Boolean(error) };
}
