"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { BellIcon, CheckIcon } from "lucide-react";
import { ErrorText, Section } from "@/components/UserDashboard";
import {
  NOTIFICATIONS_ANCHOR,
  isNewSince,
  type OpenCall,
  type OpenCallApplication,
} from "@/lib/open-calls";
import { markNotificationsRead } from "@/lib/open-calls-actions";
import { ACCENT_BORDER_CLASS, ACCENT_FILL_CLASS } from "@/lib/styles";
import { formatPostDate } from "@/lib/venue-posts";

const LINK_CLASS = "font-medium underline underline-offset-4 hover:text-muted-foreground";

/** The little sign at the top of a dashboard: a bell with the number of new notifications. Jumps to the list. */
export function NotificationSign({ count }: { count: number }) {
  const label =
    count === 0 ? "No new notifications" : `${count} new ${count === 1 ? "notification" : "notifications"}`;
  return (
    <a
      href={`#${NOTIFICATIONS_ANCHOR}`}
      aria-label={label}
      title={label}
      className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-muted"
    >
      <BellIcon className="size-5" aria-hidden />
      {count > 0 && (
        <span
          className={`absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${ACCENT_FILL_CLASS}`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </a>
  );
}

/** "2026-11-15T10:00:00Z" shown as e.g. "15 Nov 2026". The time zone is fixed so server and browser agree. */
function formatWhen(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Bucharest",
  });
}

function Item({ isNew, when, children }: { isNew: boolean; when: string; children: ReactNode }) {
  return (
    <li className={`rounded-2xl border p-4 ${isNew ? ACCENT_BORDER_CLASS : "border-border"}`}>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {isNew && (
          <span className={`rounded-full px-2 py-0.5 font-medium ${ACCENT_FILL_CLASS}`}>New</span>
        )}
        {formatWhen(when)}
      </p>
      <div className="mt-1 text-sm break-words">{children}</div>
    </li>
  );
}

/**
 * The notifications of a dashboard. A venue gets the applications to its open calls;
 * an artist gets the open calls venues posted. Whatever is newer than `seenAt` is marked "New".
 */
export default function NotificationsSection({
  role,
  applications,
  openCalls,
  seenAt,
}: {
  role: "artist" | "venue";
  /** Venue: every application to its open calls, newest first. */
  applications: OpenCallApplication[];
  /** Artist: the open calls that can still be applied to, newest first. */
  openCalls: OpenCall[];
  /** When the account last marked its notifications as read. */
  seenAt: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items = role === "venue" ? applications : openCalls;
  const newCount = items.filter((item) => isNewSince(item.createdAt, seenAt)).length;

  const markRead = () => {
    setError(null);
    startTransition(async () => {
      const result = await markNotificationsRead();
      // Reloads the dashboard data, so the sign at the top of the page updates too.
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  return (
    <div id={NOTIFICATIONS_ANCHOR} className="scroll-mt-24">
      <Section
        title="Notifications"
        hint={
          role === "venue"
            ? "Artists who applied to your open calls."
            : "Open calls posted by venues that you can apply to."
        }
      >
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {role === "venue" ? "No applications yet." : "No open calls at the moment."}
          </p>
        ) : role === "venue" ? (
          <ul className="space-y-3">
            {applications.map((application) => (
              <Item
                key={application.id}
                isNew={isNewSince(application.createdAt, seenAt)}
                when={application.createdAt}
              >
                <p>
                  <Link href={application.artist.href} className={LINK_CLASS}>
                    {application.artist.name}
                  </Link>{" "}
                  applied to <span className="font-medium">{application.postTitle}</span>.
                </p>
                {application.message && (
                  <p className="mt-2 whitespace-pre-line text-muted-foreground">{application.message}</p>
                )}
              </Item>
            ))}
          </ul>
        ) : (
          <ul className="space-y-3">
            {openCalls.map((call) => (
              <Item key={call.id} isNew={isNewSince(call.createdAt, seenAt)} when={call.createdAt}>
                <p>
                  {call.venue ? (
                    <Link href={call.venue.href} className={LINK_CLASS}>
                      {call.venue.name}
                    </Link>
                  ) : (
                    "A venue"
                  )}{" "}
                  posted a new open call: <span className="font-medium">{call.title}</span>.
                </p>
                <p className="mt-1 text-muted-foreground">Deadline: {formatPostDate(call.date)}</p>
              </Item>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {newCount > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={markRead}
              className="flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
            >
              <CheckIcon className="size-4" aria-hidden />
              {pending ? "Saving…" : "Mark all as read"}
            </button>
          )}
          {role === "artist" && (
            <Link href="/open-calls" className={`text-sm ${LINK_CLASS}`}>
              See all open calls
            </Link>
          )}
        </div>
        {error && <ErrorText>{error}</ErrorText>}
      </Section>
    </div>
  );
}
