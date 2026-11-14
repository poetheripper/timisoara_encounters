// Events and open calls that a venue publishes on its profile.
// Shared by the venue dashboard, the public profile page and the server actions.

export type VenuePostKind = "event" | "open_call";

export type VenuePost = {
  id: string;
  kind: VenuePostKind;
  title: string;
  description: string;
  /** Local calendar day, "YYYY-MM-DD": the day of an event, or the deadline of an open call. */
  date: string;
};

export const VENUE_POST_KINDS: Record<
  VenuePostKind,
  { title: string; singular: string; dateLabel: string; hint: string; empty: string }
> = {
  open_call: {
    title: "Open calls",
    singular: "open call",
    dateLabel: "Deadline",
    hint: "Invitations for artists to apply: what you are looking for and until when.",
    empty: "No open calls at the moment.",
  },
  event: {
    title: "Events",
    singular: "event",
    dateLabel: "Date",
    hint: "What is happening at your venue.",
    empty: "No upcoming events.",
  },
};

export const POST_TITLE_MAX = 80;
export const POST_DESCRIPTION_MAX = 1000;

export function isVenuePostKind(kind: unknown): kind is VenuePostKind {
  return kind === "event" || kind === "open_call";
}

function isCalendarDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Rejects days that don't exist, such as 2026-02-31.
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export type NewVenuePost = Omit<VenuePost, "id">;

/** Validates and cleans a post before saving. */
export function cleanVenuePost(
  raw: unknown,
): { ok: true; post: NewVenuePost } | { ok: false; error: string } {
  const input = (raw ?? {}) as Record<string, unknown>;
  if (!isVenuePostKind(input.kind)) return { ok: false, error: "That request was not valid." };
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  const date = String(input.date ?? "");

  if (title === "") return { ok: false, error: "Enter a title." };
  if (title.length > POST_TITLE_MAX) {
    return { ok: false, error: `Keep the title under ${POST_TITLE_MAX} characters.` };
  }
  if (description === "") return { ok: false, error: "Enter a description." };
  if (description.length > POST_DESCRIPTION_MAX) {
    return { ok: false, error: `Keep the description under ${POST_DESCRIPTION_MAX} characters.` };
  }
  if (!isCalendarDay(date)) return { ok: false, error: "Pick a date." };

  return { ok: true, post: { kind: input.kind, title, description, date } };
}

/** "YYYY-MM-DD" shown as e.g. "Sat, 15 Nov 2026". */
export function formatPostDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Today as "YYYY-MM-DD", for comparing with post dates. */
export function todayDay() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Soonest first. */
export function byDate(a: VenuePost, b: VenuePost) {
  return a.date.localeCompare(b.date);
}
