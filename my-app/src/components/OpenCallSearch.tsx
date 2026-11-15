"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CheckIcon, MegaphoneIcon, PlusIcon, SearchIcon, SendIcon } from "lucide-react";
import { FilterChip } from "@/components/EventSearchControls";
import PostLink from "@/components/PostLink";
import { ErrorText, FIELD_CLASS } from "@/components/UserDashboard";
import {
  APPLICATION_MESSAGE_MAX,
  DEADLINE_FILTERS,
  searchOpenCalls,
  type DeadlineFilterId,
  type OpenCall,
  type OpenCallViewer,
} from "@/lib/open-calls";
import { applyToOpenCall } from "@/lib/open-calls-actions";
import { ACCENT_FILL_CLASS } from "@/lib/styles";
import { VENUE_POST_KINDS, formatPostDate } from "@/lib/venue-posts";

const ACCENT_BUTTON_CLASS = `flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition disabled:opacity-50 ${ACCENT_FILL_CLASS}`;

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** What an artist sees under an open call: the Apply button, then a note to the venue and Send. */
function ApplyForm({ call, onApplied }: { call: OpenCall; onApplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={ACCENT_BUTTON_CLASS}>
        Apply
      </button>
    );
  }

  const send = () => {
    setError(null);
    startTransition(async () => {
      const result = await applyToOpenCall(call.id, message);
      if (result.ok) onApplied();
      else setError(result.error);
    });
  };

  return (
    <div>
      <label htmlFor={`apply-${call.id}`} className="text-sm text-muted-foreground">
        Message to the venue (optional)
      </label>
      <textarea
        id={`apply-${call.id}`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={APPLICATION_MESSAGE_MAX}
        rows={3}
        autoFocus
        placeholder="Introduce yourself and what you would bring."
        className={`${FIELD_CLASS} resize-y rounded-2xl py-3`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} onClick={send} className={ACCENT_BUTTON_CLASS}>
          <SendIcon className="size-4" aria-hidden />
          {pending ? "Sending…" : "Send application"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

function OpenCallCard({
  call,
  viewer,
  applied,
  onApplied,
}: {
  call: OpenCall;
  viewer: OpenCallViewer;
  applied: boolean;
  onApplied: () => void;
}) {
  const labels = VENUE_POST_KINDS.open_call;
  return (
    <li className="rounded-3xl border border-border bg-card p-6 text-left text-card-foreground">
      <p className="text-xs text-muted-foreground">
        {labels.dateLabel}: {formatPostDate(call.date)}
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight break-words">{call.title}</h2>
      {call.venue && (
        <p className="mt-1 text-sm text-muted-foreground">
          Posted by{" "}
          <Link
            href={call.venue.href}
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            {call.venue.name}
          </Link>
        </p>
      )}
      <p className="mt-3 text-sm break-words whitespace-pre-line">{call.description}</p>
      {call.link && <PostLink href={call.link} label={labels.linkLabel} />}

      {/* Applying is for artists only; everyone else is told why there is no button. */}
      <div className="mt-5 border-t border-border pt-4">
        {viewer?.role === "artist" ? (
          applied ? (
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckIcon className="size-4" aria-hidden />
              You applied to this open call.
            </p>
          ) : (
            <ApplyForm call={call} onApplied={onApplied} />
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            {viewer === null
              ? "Log in with an artist account to apply."
              : "Only artist accounts can apply to open calls."}
          </p>
        )}
      </div>
    </li>
  );
}

/** The open calls page: a search bar and filters over every open call, with applying for artists. */
export default function OpenCallSearch({
  calls,
  viewer,
  appliedIds,
  today,
  setupNeeded,
}: {
  calls: OpenCall[];
  viewer: OpenCallViewer;
  /** The open calls the artist looking at the page already applied to. */
  appliedIds: string[];
  /** "YYYY-MM-DD", worked out on the server so both renders agree on it. */
  today: string;
  /** True when the database is missing the tables this page reads. */
  setupNeeded: boolean;
}) {
  const [input, setInput] = useState("");
  const [deadlines, setDeadlines] = useState<DeadlineFilterId[]>([]);
  const [onlyNotApplied, setOnlyNotApplied] = useState(false);
  const [applied, setApplied] = useState(appliedIds);
  const isArtist = viewer?.role === "artist";

  // Unlike the event search, every open call is listed from the start and narrows while typing.
  const results = useMemo(() => {
    const found = searchOpenCalls(calls, { query: input, deadlines }, today);
    return onlyNotApplied ? found.filter((call) => !applied.includes(call.id)) : found;
  }, [calls, input, deadlines, today, onlyNotApplied, applied]);

  const hasFilters = deadlines.length > 0 || onlyNotApplied;
  const narrowed = input.trim() !== "" || hasFilters;

  return (
    <div>
      {viewer?.role === "venue" && (
        <Link href="/dashboard/venue#open-calls" className={`mx-auto mb-6 w-fit ${ACCENT_BUTTON_CLASS}`}>
          <PlusIcon className="size-4" aria-hidden />
          Post an open call
        </Link>
      )}

      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search open calls, venues…"
          aria-label="Search open calls"
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 w-full rounded-full border border-border bg-background pr-4 pl-12 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <div className="mt-5 space-y-3">
        <div role="group" aria-label="Filter open calls" className="flex flex-wrap justify-center gap-2">
          {DEADLINE_FILTERS.map((filter) => (
            <FilterChip
              key={filter.id}
              label={filter.label}
              selected={deadlines.includes(filter.id)}
              onClick={() => setDeadlines((list) => toggle(list, filter.id))}
            />
          ))}
          {isArtist && (
            <FilterChip
              label="Not applied yet"
              selected={onlyNotApplied}
              onClick={() => setOnlyNotApplied((on) => !on)}
            />
          )}
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setDeadlines([]);
              setOnlyNotApplied(false);
            }}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {setupNeeded && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-left text-sm text-foreground"
        >
          Open calls can&apos;t be loaded or applied to yet: the database is missing some tables. Run{" "}
          <code className="rounded bg-muted px-1 py-0.5">supabase/venue_posts.sql</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5">supabase/open_calls.sql</code> in the Supabase
          SQL editor, then reload this page.
        </p>
      )}

      <div className="mt-10" aria-live="polite">
        {results.length === 0 ? (
          <div className="text-muted-foreground">
            <MegaphoneIcon className="mx-auto size-8" aria-hidden />
            <p className="mt-3">
              {narrowed ? "No open calls match your search." : "There are no open calls at the moment."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? "open call" : "open calls"}
            </p>
            <ul className="mt-4 space-y-5">
              {results.map((call) => (
                <OpenCallCard
                  key={call.id}
                  call={call}
                  viewer={viewer}
                  applied={applied.includes(call.id)}
                  onApplied={() => setApplied((ids) => [...ids, call.id])}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
