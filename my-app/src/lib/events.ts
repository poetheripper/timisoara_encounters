// Single source of truth for events. The carousel, the search page and any future
// view (map, dashboards, ...) should read events from here instead of keeping their own copy.

export type EventItem = {
  id: string;
  /** Shown as the tag on cards and used as a search filter. */
  category: string;
  title: string;
  subtitle: string;
  description: string;
  /** Who organises / offers the event. */
  provider: string;
  artist: string;
  location: string;
  /** Where the event is pinned on the map. */
  coordinates: { lat: number; lng: number };
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  /** Optional CSS background. When missing, a color is generated from the event's position. */
  color?: string;
};

// Test data is dated relative to today so the time filters always have something to match.
function daysFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ✏️ Test events. Edit, add or remove entries freely; replace with real data (e.g. Supabase) later.
export const EVENTS: EventItem[] = [
  {
    id: "event-1",
    category: "Featured",
    title: "Your title here",
    subtitle: "A short description of this encounter",
    description: "A longer description of the first test event, shown when hovering over it.",
    provider: "Provider One",
    artist: "Artist One",
    location: "Piața Unirii, Timișoara",
    coordinates: { lat: 45.7579, lng: 21.229 },
    date: daysFromToday(0),
  },
  {
    id: "event-2",
    category: "Concert",
    title: "Second title",
    subtitle: "A short description of this encounter",
    description: "A longer description of the second test event, shown when hovering over it.",
    provider: "Provider Two",
    artist: "Artist Two",
    location: "Piața Victoriei, Timișoara",
    coordinates: { lat: 45.7537, lng: 21.2257 },
    date: daysFromToday(1),
  },
  {
    id: "event-3",
    category: "Exhibition",
    title: "Third title",
    subtitle: "A short description of this encounter",
    description: "A longer description of the third test event, shown when hovering over it.",
    provider: "Provider Three",
    artist: "Artist Three",
    location: "Piața Libertății, Timișoara",
    coordinates: { lat: 45.7558, lng: 21.2278 },
    date: daysFromToday(2),
  },
  {
    id: "event-4",
    category: "Venue",
    title: "Fourth title",
    subtitle: "A short description of this encounter",
    description: "A longer description of the fourth test event, shown when hovering over it.",
    provider: "Provider Four",
    artist: "Artist Four",
    location: "Parcul Rozelor, Timișoara",
    coordinates: { lat: 45.7497, lng: 21.233 },
    date: daysFromToday(5),
  },
  {
    id: "event-5",
    category: "Artist",
    title: "Fifth title",
    subtitle: "A short description of this encounter",
    description: "A longer description of the fifth test event, shown when hovering over it.",
    provider: "Provider Five",
    artist: "Artist Five",
    location: "Bastionul Theresia, Timișoara",
    coordinates: { lat: 45.7573, lng: 21.234 },
    date: daysFromToday(10),
  },
  {
    id: "event-6",
    category: "Workshop",
    title: "Sixth title",
    subtitle: "A short description of this encounter",
    description: "A longer description of the sixth test event, shown when hovering over it.",
    provider: "Provider Six",
    artist: "Artist Six",
    location: "Fabric, Timișoara",
    coordinates: { lat: 45.7576, lng: 21.2493 },
    date: daysFromToday(20),
  },
];

/** Every category in use, in first-seen order. */
export const CATEGORIES: string[] = [...new Set(EVENTS.map((e) => e.category))];

export const TIME_FILTERS = [
  { id: "today", label: "Today" },
  { id: "weekend", label: "This weekend" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
] as const;

export type TimeFilterId = (typeof TIME_FILTERS)[number]["id"];

// Placeholder for real images: hues spread by the golden angle so neighbours never look alike.
// Derived from the event's position (not Math.random) so server and client render the same color.
export function eventBackground(event: EventItem) {
  if (event.color) return event.color;
  const index = Math.max(0, EVENTS.indexOf(event));
  const hue = Math.round((index * 137.508 + 20) % 360);
  return `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 75% 30%))`;
}

export function eventDate(event: EventItem) {
  const [y, m, d] = event.date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** [start, end) of a time filter. Periods run from today to the end of the period; weeks are Monday–Sunday. */
function timeRange(filter: TimeFilterId, now: Date): [Date, Date] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const addDays = (n: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const nextMonday = addDays(7 - daysSinceMonday);

  switch (filter) {
    case "today":
      return [today, addDays(1)];
    case "weekend": {
      const saturday = addDays(5 - daysSinceMonday);
      return [saturday > today ? saturday : today, nextMonday];
    }
    case "week":
      return [today, nextMonday];
    case "month":
      return [today, new Date(today.getFullYear(), today.getMonth() + 1, 1)];
  }
}

export type EventSearch = {
  query?: string;
  categories?: string[];
  times?: TimeFilterId[];
};

/**
 * Text search over every text field, narrowed by the selected filters.
 * Several categories (or several time filters) widen the match; categories and times combine with AND.
 */
export function searchEvents(
  { query = "", categories = [], times = [] }: EventSearch,
  events: EventItem[] = EVENTS,
  now: Date = new Date(),
) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const ranges = times.map((t) => timeRange(t, now));

  return events.filter((event) => {
    if (categories.length > 0 && !categories.includes(event.category)) return false;

    if (ranges.length > 0) {
      const date = eventDate(event);
      if (!ranges.some(([start, end]) => date >= start && date < end)) return false;
    }

    const haystack = [
      event.title,
      event.subtitle,
      event.description,
      event.category,
      event.provider,
      event.artist,
      event.location,
    ]
      .join(" ")
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
