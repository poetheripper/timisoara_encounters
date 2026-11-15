import Link from "next/link";
import ContactSection from "@/components/ContactSection";
import { ProfileSection } from "@/components/UserDashboard";
import VenueLocationSection from "@/components/VenueLocationSection";
import VenuePostsSection from "@/components/VenuePostsSection";
import VenueScheduleSection from "@/components/VenueScheduleSection";
import { profileHref } from "@/lib/accounts";
import { requireRole, type AccountType } from "@/lib/auth-helpers";
import { storedContactLinks } from "@/lib/contact";
import { storedVenueLocation } from "@/lib/venue-location";
import { loadVenuePosts } from "@/lib/venue-posts-data";
import { storedVenueSchedule } from "@/lib/venue-schedule";
import { createClient } from "@/utils/supabase/server";

/**
 * Dashboard shared by artist and venue accounts: the same profile editor as the user
 * dashboard, plus the contact links. Venues also manage their location, schedule, open calls
 * and events.
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
  const [{ data, error: profileError }, venuePosts] = await Promise.all([
    supabase
      .from("users")
      .select("name, username, bio, avatar_url, cover_url, contact_links, location, schedule")
      .eq("id", account.sub)
      .maybeSingle(),
    role === "venue" ? loadVenuePosts(account.sub) : null,
  ]);
  const error = profileError || venuePosts?.error;

  // Fails until the SQL files in supabase/ have been run; the dashboard then says so.
  if (profileError) console.error(`${role} dashboard profile error:`, profileError.message);

  // The name saved in the dashboard wins over the one that came from the login.
  const name = data?.name || account.name || "";

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">{title}</h1>
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
            <VenuePostsSection
              kind="open_call"
              initial={venuePosts.posts.filter((post) => post.kind === "open_call")}
            />
            <VenuePostsSection
              kind="event"
              initial={venuePosts.posts.filter((post) => post.kind === "event")}
            />
          </>
        )}
      </div>
    </main>
  );
}
