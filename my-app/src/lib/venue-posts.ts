// Events and open calls that a venue publishes on its profile.
// Shared by the venue dashboard, the public profile page and the server actions.

import { webAddress } from "@/lib/contact";

export type VenuePostKind = "event" | "open_call";

export type VenuePost = {
  id: string;
  kind: VenuePostKind;
  title: string;
  description: string;
  /** Local calendar day, "YYYY-MM-DD": the day of an event, or the deadline of an open call. */
  date: string;
  /** Tickets or another reference website; null when there is none. */
  link: string | null;
  /** Banner picture; null when there is none (a generated color is shown instead). */
  bannerUrl: string | null;
};

export const VENUE_POST_KINDS: Record<
  VenuePostKind,
  {
    title: string;
    singular: string;
    dateLabel: string;
    hint: string;
    empty: string;
    /** Text of the button that opens the post's link. */
    linkLabel: string;
    /** Whether posts of this kind are shown with a banner picture. */
    banner: boolean;
  }
> = {
  open_call: {
    title: "Open calls",
    singular: "open call",
    dateLabel: "Deadline",
    hint: "Invitations for artists to apply: what you are looking for and until when.",
    empty: "No open calls at the moment.",
    linkLabel: "More info",
    banner: false,
  },
  event: {
    title: "Events",
    singular: "event",
    dateLabel: "Date",
    hint: "What is happening at your venue.",
    empty: "No upcoming events.",
    linkLabel: "Tickets & info",
    banner: true,
  },
};

export const POST_TITLE_MAX = 80;
export const POST_DESCRIPTION_MAX = 1000;
export const POST_LINK_MAX = 300;

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

/** What the venue fills in. The banner picture is uploaded next to it. */
export type NewVenuePost = Omit<VenuePost, "id" | "bannerUrl">;

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

  // The link is optional. "https://" is added when missing.
  const rawLink = String(input.link ?? "").trim();
  if (rawLink.length > POST_LINK_MAX) {
    return { ok: false, error: `Keep the link under ${POST_LINK_MAX} characters.` };
  }
  const link = rawLink === "" ? null : webAddress(rawLink);
  if (rawLink !== "" && !link) {
    return { ok: false, error: "Check the link: it doesn't look like a web address." };
  }

  return { ok: true, post: { kind: input.kind, title, description, date, link } };
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
