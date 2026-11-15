import { connection } from "next/server";
import { placeholderBackground } from "@/components/EventBanner";
import { displayName, profileHref } from "@/lib/accounts";
import type { HomeEvent } from "@/lib/home-events";
import { storedVenueLocation } from "@/lib/venue-location";
import { formatPostDate, todayDay } from "@/lib/venue-posts";
import { createClient } from "@/utils/supabase/server";

type VenueRow = { id: string; name: string | null; username: string | null; location: unknown };
type EventRow = {
  id: string;
  title: string;
  description: string;
  date: string;
  link: string | null;
  banner_url: string | null;
  featured?: number | null;
  // Supabase returns the joined venue as an object, or as a one-item list depending on how it reads the relation.
  venue: VenueRow | VenueRow[] | null;
};

const COLUMNS =
  "id, title, description, date, link, banner_url, venue:users(id, name, username, location)";

/** The upcoming events venues published, in the shape the homepage shows. */
export async function loadVenueEvents(): Promise<HomeEvent[]> {
  // "Today" changes between requests, so this must not be worked out when the site is built.
  await connection();
  const today = todayDay();

  const supabase = createClient();
  const query = (columns: string) =>
    supabase
      .from("venue_posts")
      .select(columns)
      .eq("kind", "event")
      .gte("date", today)
      .order("date")
      .returns<EventRow[]>();

  let { data, error } = await query(`${COLUMNS}, featured`);
  if (error) {
    // Most likely supabase/featured_events.sql has not been run yet: show the events without it.
    console.error("loadVenueEvents error:", error.message);
    ({ data, error } = await query(COLUMNS));
    if (error) console.error("loadVenueEvents error (without featured):", error.message);
  }

  return (data ?? []).map((row) => {
    const venue = Array.isArray(row.venue) ? (row.venue[0] ?? null) : row.venue;
    const hostName = venue ? displayName(venue.name, venue.username) : null;
    return {
      id: row.id,
      title: row.title,
      date: row.date,
      category: "Event",
      summary: [formatPostDate(row.date), hostName].filter(Boolean).join(" · "),
      description: row.description,
      imageUrl: row.banner_url ?? null,
      background: placeholderBackground(row.id),
      place: storedVenueLocation(venue?.location)?.address ?? hostName,
      host:
        venue && hostName
          ? { name: hostName, href: profileHref(venue.username || venue.id) }
          : null,
      link: row.link ?? null,
      featured: typeof row.featured === "number" ? row.featured : null,
    };
  });
}
