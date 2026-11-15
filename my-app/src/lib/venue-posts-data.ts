import { isVenuePostKind, type VenuePost } from "@/lib/venue-posts";
import { createClient } from "@/utils/supabase/server";

type Row = {
  id: string;
  kind: string;
  title: string;
  description: string;
  date: string;
  link: string | null;
  banner_url: string | null;
  event_id?: string | null;
};

const COLUMNS = "id, kind, title, description, date, link, banner_url";

/** All events and open calls of one venue. `error` is set while the SQL files in supabase/ have not been run. */
export async function loadVenuePosts(venueId: string) {
  const supabase = createClient();
  const query = (columns: string) =>
    supabase.from("venue_posts").select(columns).eq("venue_id", venueId).order("date").returns<Row[]>();

  let { data, error } = await query(`${COLUMNS}, event_id`);
  if (error) {
    // Most likely supabase/open_calls.sql has not been run again yet: load the posts without the connected event.
    console.error("loadVenuePosts error:", error.message);
    ({ data, error } = await query(COLUMNS));
    if (error) console.error("loadVenuePosts error (without event_id):", error.message);
  }

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
      eventId: row.event_id ?? null,
    });
  }
  return { posts, error: Boolean(error) };
}
