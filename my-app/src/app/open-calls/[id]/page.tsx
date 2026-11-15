import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import EventBanner from "@/components/EventBanner";
import { OpenCallApply } from "@/components/OpenCallSearch";
import PostLink from "@/components/PostLink";
import { currentAccount, loadOpenCall, loadOwnApplications } from "@/lib/open-calls-data";
import { POST_ID_PATTERN, VENUE_POST_KINDS, formatPostDate, todayDay } from "@/lib/venue-posts";

/** Page frame: the back link above the content. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/open-calls"
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        ← Back to open calls
      </Link>
      <div className="mt-6">{children}</div>
    </main>
  );
}

async function OpenCallContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Open call ids are UUIDs; anything else can't be one.
  if (!POST_ID_PATTERN.test(id)) notFound();
  // "Today" changes between requests, so this must not be worked out when the site is built.
  await connection();

  const [account, { call, error }] = await Promise.all([currentAccount(), loadOpenCall(id)]);
  if (error) {
    return (
      <Shell>
        <p className="text-center text-muted-foreground">This open call can&apos;t be loaded right now.</p>
      </Shell>
    );
  }
  if (!call) notFound();

  // Only artists apply, so only they have an application to look up.
  const applied = account?.role === "artist" ? await loadOwnApplications(account.id) : null;
  const labels = VENUE_POST_KINDS.open_call;
  const closed = call.date < todayDay();
  const event = call.event;

  return (
    <Shell>
      <article className="rounded-3xl border border-border bg-card p-6 text-card-foreground sm:p-8">
        {call.bannerUrl ? (
          <EventBanner
            title={call.title}
            tag={`${labels.dateLabel}: ${formatPostDate(call.date)}`}
            imageUrl={call.bannerUrl}
            seed={call.id}
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {labels.dateLabel}: {formatPostDate(call.date)}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight break-words">{call.title}</h1>
          </>
        )}

        <dl className="mt-5 space-y-1.5 text-sm">
          {call.venue && (
            <div className="flex flex-wrap gap-x-3">
              <dt className="w-24 shrink-0 text-muted-foreground">Posted by</dt>
              <dd>
                <Link
                  href={call.venue.href}
                  className="font-medium underline underline-offset-4 hover:text-muted-foreground"
                >
                  {call.venue.name}
                </Link>
              </dd>
            </div>
          )}
          <div className="flex flex-wrap gap-x-3">
            <dt className="w-24 shrink-0 text-muted-foreground">{labels.dateLabel}</dt>
            <dd className="font-medium">
              {formatPostDate(call.date)}
              {closed && " (closed)"}
            </dd>
          </div>
          {event && (
            <div className="flex flex-wrap gap-x-3">
              <dt className="w-24 shrink-0 text-muted-foreground">For the event</dt>
              <dd className="min-w-0 font-medium break-words">
                {event.title} · {formatPostDate(event.date)}
              </dd>
            </div>
          )}
        </dl>

        <p className="mt-6 break-words whitespace-pre-line">{call.description}</p>
        {call.link && <PostLink href={call.link} label={labels.linkLabel} />}

        <div className="mt-6 border-t border-border pt-5">
          <OpenCallApply
            call={call}
            viewer={account ? { role: account.role } : null}
            status={applied?.statuses[call.id] ?? null}
            closed={closed}
          />
        </div>
      </article>
    </Shell>
  );
}

export default function OpenCallPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="text-muted-foreground">Loading open call…</p>
        </Shell>
      }
    >
      <OpenCallContent params={params} />
    </Suspense>
  );
}
