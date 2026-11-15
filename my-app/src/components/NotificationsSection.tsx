"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { BellIcon, CheckIcon, XIcon } from "lucide-react";
import { ErrorText, Section } from "@/components/UserDashboard";
import {
  NOTIFICATIONS_ANCHOR,
  isNewSince,
  openCallHref,
  type ApplicationResponse,
  type DashboardNotification,
  type OpenCall,
  type OpenCallApplication,
} from "@/lib/open-calls";
import { markNotificationsRead, respondToApplication } from "@/lib/open-calls-actions";
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

/** Accept / Decline. The answer already given is filled in; the venue can still switch to the other one. */
function AnswerButton({
  chosen,
  disabled,
  onClick,
  children,
}: {
  chosen: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={chosen}
      disabled={disabled || chosen}
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition ${
        chosen
          ? `${ACCENT_FILL_CLASS} ${ACCENT_BORDER_CLASS}`
          : "border-border hover:bg-muted disabled:opacity-50"
      }`}
    >
      {children}
    </button>
  );
}

/** Venue: an artist applied to one of its open calls. Answered here. */
function ApplicationItem({
  application,
  disabled,
  onRespond,
}: {
  application: OpenCallApplication;
  disabled: boolean;
  onRespond: (accept: boolean) => void;
}) {
  return (
    <>
      <p>
        <Link href={application.artist.href} className={LINK_CLASS}>
          {application.artist.name}
        </Link>{" "}
        applied to <span className="font-medium">{application.postTitle}</span>.
      </p>
      {application.message && (
        <p className="mt-2 whitespace-pre-line text-muted-foreground">{application.message}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AnswerButton
          chosen={application.status === "accepted"}
          disabled={disabled}
          onClick={() => onRespond(true)}
        >
          <CheckIcon className="size-4" aria-hidden />
          {application.status === "accepted" ? "Accepted" : "Accept"}
        </AnswerButton>
        <AnswerButton
          chosen={application.status === "declined"}
          disabled={disabled}
          onClick={() => onRespond(false)}
        >
          <XIcon className="size-4" aria-hidden />
          {application.status === "declined" ? "Declined" : "Decline"}
        </AnswerButton>
      </div>
    </>
  );
}

/** Artist: a venue answered one of their applications. */
function ResponseItem({ response }: { response: ApplicationResponse }) {
  return (
    <>
      <p>
        {response.venue ? (
          <Link href={response.venue.href} className={LINK_CLASS}>
            {response.venue.name}
          </Link>
        ) : (
          "The venue"
        )}{" "}
        <span className="font-medium">{response.accepted ? "accepted" : "declined"}</span> your
        application to{" "}
        <Link href={openCallHref(response.call.id)} className={LINK_CLASS}>
          {response.call.title}
        </Link>
        .
      </p>
      {response.accepted && response.eventTitle && (
        <p className="mt-1 text-muted-foreground">
          You are now listed on the event “{response.eventTitle}”.
        </p>
      )}
    </>
  );
}

/** Artist: a venue posted an open call. */
function OpenCallItem({ call }: { call: OpenCall }) {
  return (
    <>
      <p>
        {call.venue ? (
          <Link href={call.venue.href} className={LINK_CLASS}>
            {call.venue.name}
          </Link>
        ) : (
          "A venue"
        )}{" "}
        posted a new open call:{" "}
        <Link href={openCallHref(call.id)} className={LINK_CLASS}>
          {call.title}
        </Link>
        .
      </p>
      <p className="mt-1 text-muted-foreground">Deadline: {formatPostDate(call.date)}</p>
    </>
  );
}

function itemKey(item: DashboardNotification) {
  if (item.kind === "application") return `application-${item.application.id}`;
  if (item.kind === "response") return `response-${item.response.id}`;
  return `open-call-${item.call.id}`;
}

/**
 * The notifications of a dashboard, newest first. A venue gets the applications to its open calls
 * and answers them here; an artist gets the open calls venues posted and the answers to their
 * applications. Whatever is newer than `seenAt` is marked "New".
 */
export default function NotificationsSection({
  role,
  notifications,
  seenAt,
}: {
  role: "artist" | "venue";
  notifications: DashboardNotification[];
  /** When the account last marked its notifications as read. */
  seenAt: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const newCount = notifications.filter((item) => isNewSince(item.at, seenAt)).length;

  // Both reload the dashboard data afterwards, so the list and the sign at the top of the page update.
  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
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
            ? "Artists who applied to your open calls. Accept or decline each application; the artist is told."
            : "Answers to your applications, and open calls posted by venues."
        }
      >
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {role === "venue" ? "No applications yet." : "Nothing yet."}
          </p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((item) => (
              <Item key={itemKey(item)} isNew={isNewSince(item.at, seenAt)} when={item.at}>
                {item.kind === "application" ? (
                  <ApplicationItem
                    application={item.application}
                    disabled={pending}
                    onRespond={(accept) => run(() => respondToApplication(item.application.id, accept))}
                  />
                ) : item.kind === "response" ? (
                  <ResponseItem response={item.response} />
                ) : (
                  <OpenCallItem call={item.call} />
                )}
              </Item>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {newCount > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(markNotificationsRead)}
              className="flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
            >
              <CheckIcon className="size-4" aria-hidden />
              Mark all as read
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
