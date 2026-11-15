// The open calls page and the notifications that come with it.
// Shared by the page, the dashboards and the server actions.

import type { AccountType } from "@/lib/auth-helpers";

/** An open call as the open calls page lists it: the venue's post plus who posted it. */
export type OpenCall = {
  id: string;
  title: string;
  description: string;
  /** Deadline, as a local calendar day "YYYY-MM-DD". */
  date: string;
  link: string | null;
  /** When the venue posted it (ISO timestamp). */
  createdAt: string;
  venue: { name: string; href: string } | null;
};

/** Who is looking at the open calls page. Only artists can apply; only venues can post. */
export type OpenCallViewer = { role: AccountType } | null;

/** An artist's application, as the venue that posted the open call sees it. */
export type OpenCallApplication = {
  id: string;
  postTitle: string;
  artist: { name: string; href: string };
  message: string | null;
  /** When the artist applied (ISO timestamp). */
  createdAt: string;
};

export const APPLICATION_MESSAGE_MAX = 500;

/** Where the dashboards keep the notifications; the sign at the top of the page jumps here. */
export const NOTIFICATIONS_ANCHOR = "notifications";

/** True for something that happened after the account last marked its notifications as read. */
export function isNewSince(createdAt: string, seenAt: string | null) {
  return seenAt === null || new Date(createdAt) > new Date(seenAt);
}

export const DEADLINE_FILTERS = [
  { id: "week", label: "Closing within 7 days", days: 7 },
  { id: "month", label: "Closing within 30 days", days: 30 },
] as const;

export type DeadlineFilterId = (typeof DEADLINE_FILTERS)[number]["id"];

function dayPlus(today: string, days: number) {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Text search over the title, description and venue name, narrowed by the deadline filters.
 * Several deadline filters widen the match. `today` is a "YYYY-MM-DD" day.
 */
export function searchOpenCalls(
  calls: OpenCall[],
  { query = "", deadlines = [] }: { query?: string; deadlines?: DeadlineFilterId[] },
  today: string,
) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  // The widest selected period decides; "YYYY-MM-DD" days compare correctly as text.
  const days = DEADLINE_FILTERS.filter((f) => deadlines.includes(f.id)).map((f) => f.days);
  const latest = days.length > 0 ? dayPlus(today, Math.max(...days)) : null;

  return calls.filter((call) => {
    if (latest !== null && call.date > latest) return false;
    const haystack = [call.title, call.description, call.venue?.name ?? ""].join(" ").toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
