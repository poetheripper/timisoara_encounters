import { connection } from "next/server";
import { placeholderBackground } from "@/components/EventBanner";
import { displayName } from "@/lib/accounts";
import type { EventItem } from "@/lib/events";
import { loadEventArtists } from "@/lib/open-calls-data";
import { storedVenueLocation } from "@/lib/venue-location";
import { todayDay } from "@/lib/venue-posts";
import { createClient } from "@/utils/supabase/server";

type VenueRow = { id: string; name: string | null; username: string | null; location: unknown };
type EventRow = {
  id: string;
  title: string;
  description: string;
  date: string;
  banner_url: string | null;
  category?: string | null;
  // Supabase returns the joined venue as an object, or as a one-item list depending on how it reads the relation.
  venue: VenueRow | VenueRow[] | null;
};

const COLUMNS = "id, title, description, date, banner_url, venue:users(id, name, username, location)";

/** Shown as the tag of an event posted before venues picked a category. It is not a filter. */
const NO_CATEGORY = "Event";

/**
 * The upcoming events venues published, in the shape the search, the map and the saved events use.
 * They are searched together with the test events from src/lib/events.ts.
 */
export async function loadSearchEvents(): Promise<EventItem[]> {
  // "Today" changes between requests, so this must not be worked out when the site is built.
  await connection();

  const supabase = createClient();
  const query = (columns: string) =>
    supabase
      .from("venue_posts")
      .select(columns)
      .eq("kind", "event")
      .gte("date", todayDay())
      .order("date")
      .returns<EventRow[]>();

  let { data, error } = await query(`${COLUMNS}, category`);
  if (error) {
    // Most likely supabase/event_categories.sql has not been run yet: show the events without a category.
    console.error("loadSearchEvents error:", error.message);
    ({ data, error } = await query(COLUMNS));
    if (error) console.error("loadSearchEvents error (without category):", error.message);
  }
  const rows = data ?? [];
  const artists = await loadEventArtists(rows.map((row) => row.id));

  return rows.map((row) => {
    const venue = Array.isArray(row.venue) ? (row.venue[0] ?? null) : row.venue;
    const venueName = venue ? displayName(venue.name, venue.username) : "";
    const location = storedVenueLocation(venue?.location);
    return {
      id: row.id,
      category: row.category || NO_CATEGORY,
      title: row.title,
      subtitle: venueName,
      description: row.description,
      provider: venueName,
      // The artists the venue accepted through an open call connected to the event.
      artist: (artists[row.id] ?? []).map((artist) => artist.name).join(", "),
      location: location?.address ?? venueName,
      // Only venues that put a pin on their map can be shown on the map page.
      coordinates: location?.coordinates ?? null,
      date: row.date,
      // The banner; the address was made by Supabase, so it is safe inside url("…").
      color: row.banner_url
        ? `center / cover no-repeat url("${row.banner_url}")`
        : placeholderBackground(row.id),
    };
  });
}
