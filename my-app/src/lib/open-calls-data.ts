import { displayName, profileHref } from "@/lib/accounts";
import { auth0 } from "@/lib/auth0";
import type { AccountType } from "@/lib/auth-helpers";
import type { OpenCall, OpenCallApplication } from "@/lib/open-calls";
import { todayDay } from "@/lib/venue-posts";
import { createClient } from "@/utils/supabase/server";

type AccountRow = { id: string; name: string | null; username: string | null };
// Supabase returns a joined row as an object, or as a one-item list depending on how it reads the relation.
type Joined<T> = T | T[] | null;

function single<T>(joined: Joined<T>) {
  return Array.isArray(joined) ? (joined[0] ?? null) : joined;
}

function accountLink(account: AccountRow) {
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
  created_at: string;
  venue: Joined<AccountRow>;
};

/** Every open call whose deadline has not passed, soonest deadline first. */
export async function loadOpenCalls() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("venue_posts")
    .select("id, title, description, date, link, created_at, venue:users(id, name, username)")
    .eq("kind", "open_call")
    .gte("date", todayDay())
    .order("date")
    .returns<OpenCallRow[]>();
  if (error) console.error("loadOpenCalls error:", error.message);

  const calls: OpenCall[] = (data ?? []).map((row) => {
    const venue = single(row.venue);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      date: row.date,
      link: row.link ?? null,
      createdAt: row.created_at,
      venue: venue ? accountLink(venue) : null,
    };
  });
  return { calls, error: Boolean(error) };
}

/** Ids of the open calls an artist applied to. `error` is set while supabase/open_calls.sql has not been run. */
export async function loadAppliedCallIds(artistId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("open_call_applications")
    .select("post_id")
    .eq("artist_id", artistId);
  if (error) console.error("loadAppliedCallIds error:", error.message);
  return { ids: (data ?? []).map((row) => row.post_id as string), error: Boolean(error) };
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
  created_at: string;
  artist: Joined<AccountRow>;
};

/** The applications to a venue's open calls, newest first. `posts` are that venue's open calls. */
export async function loadApplications(posts: { id: string; title: string }[]) {
  if (posts.length === 0) return { applications: [], error: false };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("open_call_applications")
    .select("id, post_id, message, created_at, artist:users(id, name, username)")
    .in(
      "post_id",
      posts.map((post) => post.id),
    )
    .order("created_at", { ascending: false })
    .returns<ApplicationRow[]>();
  if (error) console.error("loadApplications error:", error.message);

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
      createdAt: row.created_at,
    });
  }
  return { applications, error: Boolean(error) };
}
