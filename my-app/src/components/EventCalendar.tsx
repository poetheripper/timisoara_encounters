"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import PostLink from "@/components/PostLink";
import { formatMonth, monthKey, type HomeEvent } from "@/lib/home-events";
import { formatPostDate } from "@/lib/venue-posts";

// ✏️ How many events one page of the calendar shows.
const PAGE_SIZE = 12;

// The card layouts, one per window width. All of them are in the page and CSS shows the one
// that fits, so the right layout is there from the first paint (no jump once scripts load).
const LAYOUTS = [
  { columns: 1, show: "flex sm:hidden" },
  { columns: 2, show: "hidden sm:flex lg:hidden" },
  { columns: 3, show: "hidden lg:flex xl:hidden" },
  { columns: 4, show: "hidden xl:flex" },
];

// Picture shapes. Each card picks one from its id, so the grid looks uneven
// but a card keeps its shape wherever it appears.
const PICTURE_SHAPES = ["aspect-[4/3]", "aspect-square", "aspect-[16/10]", "aspect-[4/5]"];
const PLACEHOLDER_SHAPES = ["aspect-[5/2]", "aspect-[16/9]", "aspect-[4/3]", "aspect-[2/1]"];

function pickShape(event: HomeEvent) {
  let hash = 0;
  for (const char of event.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const shapes = event.imageUrl ? PICTURE_SHAPES : PLACEHOLDER_SHAPES;
  return shapes[hash % shapes.length];
}

function EventCard({ event }: { event: HomeEvent }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-3 text-card-foreground">
      <div className="flex items-center justify-between gap-3 text-[0.65rem] font-medium tracking-widest uppercase">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-[#4E418C] dark:bg-[#B9ADEB]" />
          {formatPostDate(event.date)}
        </span>
        <span className="text-muted-foreground">{event.category}</span>
      </div>

      <div
        className={`relative mt-3 overflow-hidden rounded-xl ${pickShape(event)}`}
        style={{ background: event.background }}
      >
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- user upload, already resized
          <img src={event.imageUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        )}
      </div>

      <div className="px-1 pt-3 pb-1">
        <h4 className="text-xl leading-tight font-semibold tracking-tight break-words">{event.title}</h4>
        {event.place && <p className="mt-2 text-xs break-words">{event.place}</p>}
        <p className="mt-2 line-clamp-5 text-xs break-words whitespace-pre-line text-muted-foreground">
          {event.description}
        </p>
        {event.host && (
          <p className="mt-2 text-xs">
            Hosted by{" "}
            {event.host.href ? (
              <Link href={event.host.href} className="underline underline-offset-2 hover:text-muted-foreground">
                {event.host.name}
              </Link>
            ) : (
              event.host.name
            )}
          </p>
        )}
        {event.link && <PostLink href={event.link} label="Tickets & info" />}
      </div>
    </article>
  );
}

/**
 * Cards in columns of uneven height. Events are dealt out to the columns one by one,
 * so reading the top row from left to right, then the next row, follows the dates.
 */
function CardColumns({
  events,
  columns,
  className,
}: {
  events: HomeEvent[];
  columns: number;
  className: string;
}) {
  const dealt: HomeEvent[][] = Array.from({ length: columns }, () => []);
  events.forEach((event, index) => dealt[index % columns].push(event));
  return (
    <div className={`items-start gap-3 ${className}`}>
      {dealt.map((column, index) => (
        <div key={index} className="flex min-w-0 flex-1 flex-col gap-3">
          {column.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ))}
    </div>
  );
}

const PAGE_BUTTON_CLASS =
  "flex h-10 min-w-10 items-center justify-center rounded-full border border-border px-3 text-sm font-medium transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

/** Every upcoming event, soonest first, grouped by month and split into pages. */
export default function EventCalendar({ events }: { events: HomeEvent[] }) {
  const top = useRef<HTMLElement>(null);
  const pageCount = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const [requestedPage, setPage] = useState(0);
  const page = Math.min(requestedPage, pageCount - 1);

  // The events of this page, split by month (`events` is already sorted by date).
  const months: { key: string; events: HomeEvent[] }[] = [];
  for (const event of events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)) {
    const key = monthKey(event);
    if (months.at(-1)?.key === key) months.at(-1)?.events.push(event);
    else months.push({ key, events: [event] });
  }

  const goTo = (next: number) => {
    setPage(next);
    top.current?.scrollIntoView({ block: "start" });
  };

  return (
    <section ref={top} aria-labelledby="calendar-title" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b border-border pb-4">
        <h2 id="calendar-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
          Calendar
        </h2>
        <p className="text-sm text-muted-foreground">
          {events.length === 0
            ? "No upcoming events yet."
            : `${events.length} upcoming event${events.length === 1 ? "" : "s"}, soonest first.`}
        </p>
      </div>

      {months.map((month) => (
        <div key={month.key} className="mt-8">
          <h3 className="mb-3 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {formatMonth(month.key)}
          </h3>
          {LAYOUTS.map(({ columns, show }) => (
            <CardColumns key={columns} events={month.events} columns={columns} className={show} />
          ))}
        </div>
      ))}

      {pageCount > 1 && (
        <nav aria-label="Calendar pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => goTo(page - 1)}
            className={PAGE_BUTTON_CLASS}
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Page ${index + 1}`}
              aria-current={index === page ? "page" : undefined}
              onClick={() => goTo(index)}
              className={`${PAGE_BUTTON_CLASS} ${
                index === page ? "border-foreground bg-foreground text-background hover:bg-foreground" : ""
              }`}
            >
              {index + 1}
            </button>
          ))}
          <button
            type="button"
            aria-label="Next page"
            disabled={page === pageCount - 1}
            onClick={() => goTo(page + 1)}
            className={PAGE_BUTTON_CLASS}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </nav>
      )}
    </section>
  );
}
