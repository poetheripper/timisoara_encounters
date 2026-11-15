// The events shown on the homepage (carousel + calendar), in one common shape:
// the events venues publish from their dashboard, plus the test events from src/lib/events.ts.

import { EVENTS, eventBackground } from "@/lib/events";

export type HomeEvent = {
  id: string;
  title: string;
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  /** Shown as the tag on cards. */
  category: string;
  /** One short line, shown under the title in the carousel. */
  summary: string;
  description: string;
  imageUrl: string | null;
  /** CSS background shown when there is no picture. */
  background: string;
  /** Where it happens: an address or the name of a place. */
  place: string | null;
  /** Who organises it; `href` leads to their profile when they have one. */
  host: { name: string; href: string | null } | null;
  /** Tickets or another reference website. */
  link: string | null;
  /** Chosen by the administrator: null = not featured, lower numbers come first in the carousel. */
  featured: number | null;
};

/** How many events the carousel shows when the administrator has not featured any. */
const CAROUSEL_FALLBACK_COUNT = 5;

const bySoonest = (a: HomeEvent, b: HomeEvent) =>
  a.date.localeCompare(b.date) || a.title.localeCompare(b.title);

// ✏️ Remove this (and its use below) once the site only shows real events.
function testEvents(): HomeEvent[] {
  return EVENTS.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    category: event.category,
    summary: event.subtitle,
    description: event.description,
    imageUrl: null,
    background: eventBackground(event),
    place: event.location,
    host: { name: event.provider, href: null },
    link: null,
    featured: event.featured ?? null,
  }));
}

/** Every event for the homepage, soonest first. */
export function homeEvents(venueEvents: HomeEvent[]): HomeEvent[] {
  return [...venueEvents, ...testEvents()].sort(bySoonest);
}

/**
 * The carousel slides: the events the administrator featured, in the order they chose.
 * While none is featured, the next few upcoming events are shown instead.
 */
export function featuredEvents(events: HomeEvent[]): HomeEvent[] {
  const featured = events
    .filter((event) => event.featured !== null)
    .sort((a, b) => (a.featured as number) - (b.featured as number) || bySoonest(a, b));
  return featured.length > 0 ? featured : events.slice(0, CAROUSEL_FALLBACK_COUNT);
}

/** "2026-11" for an event on any day of November 2026: what the calendar groups by. */
export function monthKey(event: HomeEvent) {
  return event.date.slice(0, 7);
}

/** "2026-11" shown as "November 2026". */
export function formatMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
