import Link from "next/link";
import ContactSection from "@/components/ContactSection";
import NotificationsSection, { NotificationSign } from "@/components/NotificationsSection";
import { ProfileSection } from "@/components/UserDashboard";
import VenueLocationSection from "@/components/VenueLocationSection";
import VenuePostsSection from "@/components/VenuePostsSection";
import VenueScheduleSection from "@/components/VenueScheduleSection";
import { profileHref } from "@/lib/accounts";
import { requireRole, type AccountType } from "@/lib/auth-helpers";
import { storedContactLinks } from "@/lib/contact";
import { isNewSince } from "@/lib/open-calls";
import { loadApplications, loadNotificationsSeenAt, loadOpenCalls } from "@/lib/open-calls-data";
import { storedVenueLocation } from "@/lib/venue-location";
import { loadVenuePosts } from "@/lib/venue-posts-data";
import { storedVenueSchedule } from "@/lib/venue-schedule";
import { createClient } from "@/utils/supabase/server";

/**
 * Dashboard shared by artist and venue accounts: the same profile editor as the user
 * dashboard, plus the contact links. Venues also manage their location, schedule, open calls
 * and events.
 * Both get notifications: a venue when an artist applies to one of its open calls, an artist
 * when a venue posts an open call.
 * Sends other roles to their own dashboard.
 */
export default async function CreatorDashboard({
  role,
  title,
}: {
  role: Extract<AccountType, "artist" | "venue">;
  title: string;
}) {
  const account = await requireRole([role]);

  const supabase = createClient();
  const [{ data, error: profileError }, venuePosts, seen, openCalls] = await Promise.all([
    supabase
      .from("users")
      .select("name, username, bio, avatar_url, cover_url, contact_links, location, schedule")
      .eq("id", account.sub)
      .maybeSingle(),
    role === "venue" ? loadVenuePosts(account.sub) : null,
    loadNotificationsSeenAt(account.sub),
    role === "artist" ? loadOpenCalls() : null,
  ]);
  // Applications are looked up through the venue's own open calls.
  const received = venuePosts
    ? await loadApplications(venuePosts.posts.filter((post) => post.kind === "open_call"))
    : null;
  const applications = received?.applications ?? [];
  // Newest first, like the applications.
  const postedCalls = [...(openCalls?.calls ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
  const newCount = [...applications, ...postedCalls].filter((item) =>
    isNewSince(item.createdAt, seen.seenAt),
  ).length;
  const notificationsError = seen.error || received?.error || openCalls?.error;
  const error = profileError || venuePosts?.error;

  // Fails until the SQL files in supabase/ have been run; the dashboard then says so.
  if (profileError) console.error(`${role} dashboard profile error:`, profileError.message);

  // The name saved in the dashboard wins over the one that came from the login.
  const name = data?.name || account.name || "";

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <NotificationSign count={newCount} />
      </div>
      <p className="text-muted-foreground mt-1">Welcome, {name || account.email}</p>
      <Link
        href={profileHref(data?.username || account.sub)}
        className="mt-2 inline-block text-sm underline underline-offset-4 hover:text-muted-foreground"
      >
        View your public profile
      </Link>

      <div className="mt-8 space-y-6">
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
          >
            Your profile can&apos;t be loaded or saved yet: the database is missing some columns or
            tables. Run <code className="rounded bg-muted px-1 py-0.5">supabase/user_dashboard.sql</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5">supabase/contact_links.sql</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5">supabase/venue_posts.sql</code> and{" "}
            <code className="rounded bg-muted px-1 py-0.5">supabase/venue_details.sql</code> in the
            Supabase SQL editor, then reload this page.
          </p>
        )}
        {notificationsError && (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
          >
            Notifications can&apos;t be loaded yet: run{" "}
            <code className="rounded bg-muted px-1 py-0.5">supabase/open_calls.sql</code> in the
            Supabase SQL editor, then reload this page.
          </p>
        )}
        <ProfileSection
          profile={{
            name,
            email: account.email ?? "",
            username: data?.username ?? "",
            bio: data?.bio ?? "",
            avatarUrl: data?.avatar_url ?? null,
            coverUrl: data?.cover_url ?? null,
          }}
        />
        <ContactSection initial={storedContactLinks(data?.contact_links)} />
        {venuePosts && (
          <>
            <VenueLocationSection initial={storedVenueLocation(data?.location)} />
            <VenueScheduleSection initial={storedVenueSchedule(data?.schedule)} />
            {/* The open calls page links here for venues that want to post one. */}
            <div id="open-calls" className="scroll-mt-24">
              <VenuePostsSection
                kind="open_call"
                initial={venuePosts.posts.filter((post) => post.kind === "open_call")}
              />
            </div>
            <VenuePostsSection
              kind="event"
              initial={venuePosts.posts.filter((post) => post.kind === "event")}
            />
          </>
        )}
        <NotificationsSection
          role={role}
          applications={applications}
          openCalls={postedCalls}
          seenAt={seen.seenAt}
        />
      </div>
    </main>
  );
}
