import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROLE_LABEL, displayName, publicRole } from "@/lib/accounts";
import { contactType, storedContactLinks, type ContactLink } from "@/lib/contact";
import { ACCENT_FILL_CLASS } from "@/lib/styles";
import {
  VENUE_POST_KINDS,
  formatPostDate,
  todayDay,
  type VenuePost,
  type VenuePostKind,
} from "@/lib/venue-posts";
import { loadVenuePosts } from "@/lib/venue-posts-data";
import { createClient } from "@/utils/supabase/server";

/** Finds a public account by the last part of its profile address: a username, or an account id. */
async function loadAccount(handle: string) {
  const supabase = createClient();
  const query = supabase
    .from("users")
    .select("id, name, username, bio, avatar_url, cover_url, contact_links, role");

  // Account ids always contain "|" (e.g. "auth0|abc"), which usernames can't.
  if (handle.includes("|")) return query.eq("id", handle).maybeSingle();
  if (!/^[a-zA-Z0-9._]+$/.test(handle)) return { data: null, error: null };
  // Usernames match regardless of letter case; "_" is escaped because it is a wildcard in ilike.
  return query.ilike("username", handle.replace(/_/g, "\\_")).maybeSingle();
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ContactList({ links }: { links: ContactLink[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {links.map((link, index) => {
        const isEmail = link.type === "email";
        return (
          <li key={index} className="flex flex-wrap gap-x-3">
            <span className="w-24 shrink-0 text-muted-foreground">
              {contactType(link.type)?.label ?? "Link"}
            </span>
            <a
              href={isEmail ? `mailto:${link.value}` : link.value}
              {...(isEmail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              className="min-w-0 font-medium break-all underline underline-offset-4 hover:text-muted-foreground"
            >
              {/* Web addresses are shown without the "https://" and a trailing "/". */}
              {isEmail ? link.value : link.value.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function PostList({ kind, posts }: { kind: VenuePostKind; posts: VenuePost[] }) {
  const labels = VENUE_POST_KINDS[kind];
  return (
    <Card title={labels.title}>
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground">
                {labels.dateLabel}: {formatPostDate(post.date)}
              </p>
              <h3 className="mt-1 font-semibold tracking-tight break-words">{post.title}</h3>
              <p className="mt-1 text-sm break-words whitespace-pre-line text-muted-foreground">
                {post.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function ProfileContent({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { data: account, error } = await loadAccount(decodeURIComponent(handle));
  if (error) {
    console.error("Profile page error:", error.message);
    return <p className="text-center text-muted-foreground">This profile can&apos;t be loaded right now.</p>;
  }

  // Only artists and venues have a public profile.
  const role = publicRole(account?.role);
  if (!account || !role) notFound();

  const name = displayName(account.name, account.username);
  const links = storedContactLinks(account.contact_links);
  const venuePosts = role === "venue" ? await loadVenuePosts(account.id) : null;
  // Past events and closed open calls are left out.
  const today = todayDay();
  const upcoming = (kind: VenuePostKind) =>
    (venuePosts?.posts ?? []).filter((post) => post.kind === kind && post.date >= today);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
        {/* Cover picture, with the profile picture overlapping its bottom edge. */}
        <div className="relative mb-14">
          <div className="h-36 overflow-hidden rounded-2xl bg-muted sm:h-56">
            {account.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element -- user upload, already resized
              <img src={account.cover_url} alt="" className="size-full object-cover" />
            )}
          </div>
          <div className="absolute -bottom-12 left-5 flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-muted text-2xl font-semibold text-muted-foreground">
            {account.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- user upload, already resized
              <img src={account.avatar_url} alt={`${name}'s profile picture`} className="size-full object-cover" />
            ) : (
              <span aria-hidden>{name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight break-words">{name}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${ACCENT_FILL_CLASS}`}>
            {ROLE_LABEL[role]}
          </span>
        </div>
        {account.username && <p className="mt-1 text-muted-foreground">@{account.username}</p>}
        {account.bio ? (
          <p className="mt-4 break-words whitespace-pre-line">{account.bio}</p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No description yet.</p>
        )}
      </section>

      <Card title="Contact">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contact details yet.</p>
        ) : (
          <ContactList links={links} />
        )}
      </Card>

      {venuePosts && (
        <>
          <PostList kind="open_call" posts={upcoming("open_call")} />
          <PostList kind="event" posts={upcoming("event")} />
        </>
      )}
    </div>
  );
}

export default function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link
        href="/search"
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        ← Back to search
      </Link>
      <div className="mt-6">
        <Suspense fallback={<p className="text-muted-foreground">Loading profile…</p>}>
          <ProfileContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}
