import { displayName, profileHref } from "@/lib/accounts";
import { auth0 } from "@/lib/auth0";
import type { AccountType } from "@/lib/auth-helpers";
import {
  applicationStatus,
  type AccountLink,
  type ApplicationResponse,
  type ApplicationStatus,
  type OpenCall,
  type OpenCallApplication,
} from "@/lib/open-calls";
import { todayDay } from "@/lib/venue-posts";
import { createClient } from "@/utils/supabase/server";

type AccountRow = { id: string; name: string | null; username: string | null };
// Supabase returns a joined row as an object, or as a one-item list depending on how it reads the relation.
type Joined<T> = T | T[] | null;

function single<T>(joined: Joined<T>) {
  return Array.isArray(joined) ? (joined[0] ?? null) : joined;
}

function accountLink(account: AccountRow): AccountLink {
  return {
    name: displayName(account.name, account.username),
    href: profileHref(account.username || account.id),
  };
}

/** The logged-in account's id and role, or null when logged out (or not set up yet). */
export async function currentAccount(): Promise<{ id: string; role: AccountType } | null> {
  const session = await auth0.getSession();
  const id = session?.user?.sub;
  if (!id) return null;

  const supabase = createClient();
  const { data } = await supabase.from("users").select("role").eq("id", id).maybeSingle();
  if (!data) return null;
  // "provider" is the old name for venues.
  const role: AccountType =
    data.role === "artist" ? "artist" : data.role === "venue" || data.role === "provider" ? "venue" : "user";
  return { id, role };
}

type OpenCallRow = {
  id: string;
  title: string;
  description: string;
  date: string;
  link: string | null;
  banner_url: string | null;
  created_at: string;
  event_id?: string | null;
  venue: Joined<AccountRow>;
};

const OPEN_CALL_COLUMNS =
  "id, title, description, date, link, banner_url, created_at, venue:users(id, name, username)";

function openCall(row: OpenCallRow): OpenCall {
  const venue = single(row.venue);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    link: row.link ?? null,
    bannerUrl: row.banner_url ?? null,
    createdAt: row.created_at,
    venue: venue ? accountLink(venue) : null,
  };
}

/** Every open call whose deadline has not passed, soonest deadline first. */
export async function loadOpenCalls() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("venue_posts")
    .select(OPEN_CALL_COLUMNS)
    .eq("kind", "open_call")
    .gte("date", todayDay())
    .order("date")
    .returns<OpenCallRow[]>();
  if (error) console.error("loadOpenCalls error:", error.message);

  return { calls: (data ?? []).map(openCall), error: Boolean(error) };
}

/** One open call for its own page, with the event it is connected to. `call` is null when it doesn't exist. */
export async function loadOpenCall(id: string) {
  const supabase = createClient();
  const query = (columns: string) =>
    supabase
      .from("venue_posts")
      .select(columns)
      .eq("id", id)
      .eq("kind", "open_call")
      .returns<OpenCallRow[]>()
      .maybeSingle();

  let { data, error } = await query(`${OPEN_CALL_COLUMNS}, event_id`);
  if (error) {
    // Most likely supabase/open_calls.sql has not been run again yet: show the call without its event.
    console.error("loadOpenCall error:", error.message);
    ({ data, error } = await query(OPEN_CALL_COLUMNS));
    if (error) console.error("loadOpenCall error (without event_id):", error.message);
  }
  if (!data) return { call: null, event: null, error: Boolean(error) };

  let event: { title: string; date: string } | null = null;
  if (data.event_id) {
    const found = await supabase
      .from("venue_posts")
      .select("title, date")
      .eq("id", data.event_id)
      .eq("kind", "event")
      .maybeSingle();
    if (found.error) console.error("loadOpenCall event error:", found.error.message);
    event = found.data ?? null;
  }
  return { call: openCall(data), event, error: false };
}


/**
 * The open calls an artist applied to, with the venue's answer, by open call id.
 * `error` is set while supabase/open_calls.sql has not been run.
 */
export async function loadOwnApplications(artistId: string) {
  const supabase = createClient();
  const query = (columns: string) =>
    supabase
      .from("open_call_applications")
      .select(columns)
      .eq("artist_id", artistId)
      .returns<{ post_id: string; status?: string }[]>();

  let { data, error } = await query("post_id, status");
  if (error) {
    // Most likely supabase/open_calls.sql has not been run again yet: every application counts as unanswered.
    console.error("loadOwnApplications error:", error.message);
    ({ data, error } = await query("post_id"));
    if (error) console.error("loadOwnApplications error (without status):", error.message);
  }

  const statuses: Record<string, ApplicationStatus> = {};
  for (const row of data ?? []) statuses[row.post_id] = applicationStatus(row.status);
  return { statuses, error: Boolean(error) };
}

/** When an account last marked its notifications as read; null when it never did. */
export async function loadNotificationsSeenAt(accountId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("notifications_seen_at")
    .eq("id", accountId)
    .maybeSingle();
  if (error) console.error("loadNotificationsSeenAt error:", error.message);
  return { seenAt: (data?.notifications_seen_at as string | null) ?? null, error: Boolean(error) };
}

type ApplicationRow = {
  id: string;
  post_id: string;
  message: string | null;
  status?: string;
  created_at: string;
  artist: Joined<AccountRow>;
};

/** The applications to a venue's open calls, newest first. `posts` are that venue's open calls. */
export async function loadApplications(posts: { id: string; title: string }[]) {
  if (posts.length === 0) return { applications: [], error: false };

  const supabase = createClient();
  const columns = "id, post_id, message, created_at, artist:users(id, name, username)";
  const query = (select: string) =>
    supabase
      .from("open_call_applications")
      .select(select)
      .in(
        "post_id",
        posts.map((post) => post.id),
      )
      .order("created_at", { ascending: false })
      .returns<ApplicationRow[]>();

  let { data, error } = await query(`${columns}, status`);
  // Reported as an error either way: answering an application needs the status column.
  const statusMissing = Boolean(error);
  if (error) {
    // Most likely supabase/open_calls.sql has not been run again yet: list them without the answer.
    console.error("loadApplications error:", error.message);
    ({ data, error } = await query(columns));
    if (error) console.error("loadApplications error (without status):", error.message);
  }

  const titles = new Map(posts.map((post) => [post.id, post.title]));
  const applications: OpenCallApplication[] = [];
  for (const row of data ?? []) {
    const artist = single(row.artist);
    if (!artist) continue;
    applications.push({
      id: row.id,
      postTitle: titles.get(row.post_id) ?? "Open call",
      artist: accountLink(artist),
      message: row.message || null,
      status: applicationStatus(row.status),
      createdAt: row.created_at,
    });
  }
  return { applications, error: statusMissing };
}

type ResponseRow = {
  id: string;
  status: string;
  responded_at: string | null;
  created_at: string;
  post: Joined<{ id: string; title: string; event_id: string | null; venue: Joined<AccountRow> }>;
};

/** The answers venues gave to an artist's applications, newest first. */
export async function loadResponses(artistId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("open_call_applications")
    .select(
      "id, status, responded_at, created_at, post:venue_posts(id, title, event_id, venue:users(id, name, username))",
    )
    .eq("artist_id", artistId)
    .neq("status", "pending")
    .order("responded_at", { ascending: false })
    .returns<ResponseRow[]>();
  if (error) console.error("loadResponses error:", error.message);

  const rows = (data ?? []).flatMap((row) => {
    const post = single(row.post);
    return post ? [{ row, post }] : [];
  });

  // The titles of the connected events, to tell an accepted artist where they now appear.
  const eventIds = [...new Set(rows.flatMap(({ post }) => (post.event_id ? [post.event_id] : [])))];
  const eventTitles = new Map<string, string>();
  if (eventIds.length > 0) {
    const events = await supabase.from("venue_posts").select("id, title").in("id", eventIds);
    if (events.error) console.error("loadResponses events error:", events.error.message);
    for (const event of events.data ?? []) eventTitles.set(event.id, event.title);
  }

  const responses: ApplicationResponse[] = rows.map(({ row, post }) => {
    const venue = single(post.venue);
    return {
      id: row.id,
      accepted: row.status === "accepted",
      call: { id: post.id, title: post.title },
      venue: venue ? accountLink(venue) : null,
      eventTitle: (post.event_id && eventTitles.get(post.event_id)) || null,
      respondedAt: row.responded_at ?? row.created_at,
    };
  });
  return { responses, error: Boolean(error) };
}

/**
 * The artists accepted through an open call connected to each of these events, by event id.
 * Empty while supabase/open_calls.sql has not been run again.
 */
export async function loadEventArtists(eventIds: string[]): Promise<Record<string, AccountLink[]>> {
  if (eventIds.length === 0) return {};

  const supabase = createClient();
  const calls = await supabase.from("venue_posts").select("id, event_id").in("event_id", eventIds);
  if (calls.error) {
    console.error("loadEventArtists error:", calls.error.message);
    return {};
  }
  const eventOfCall = new Map<string, string>();
  for (const call of calls.data ?? []) eventOfCall.set(call.id, call.event_id);
  if (eventOfCall.size === 0) return {};

  const { data, error } = await supabase
    .from("open_call_applications")
    .select("post_id, artist:users(id, name, username)")
    .in("post_id", [...eventOfCall.keys()])
    .eq("status", "accepted")
    .order("responded_at")
    .returns<{ post_id: string; artist: Joined<AccountRow> }[]>();
  if (error) {
    console.error("loadEventArtists applications error:", error.message);
    return {};
  }

  const artists: Record<string, AccountLink[]> = {};
  for (const row of data ?? []) {
    const artist = single(row.artist);
    const eventId = eventOfCall.get(row.post_id);
    if (!artist || !eventId) continue;
    const link = accountLink(artist);
    const list = (artists[eventId] ??= []);
    // An artist accepted through two open calls of the same event is listed once.
    if (!list.some((other) => other.href === link.href)) list.push(link);
  }
  return artists;
}
