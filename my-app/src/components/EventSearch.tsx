"use client";

import { CalendarIcon, MapPinIcon, MicIcon, StoreIcon } from "lucide-react";
import EventSearchControls, { searchSummary, useEventSearch } from "@/components/EventSearchControls";
import SaveEventButton, { useSavedEvents } from "@/components/SaveEventButton";
import { eventBackground, eventDate, type EventItem } from "@/lib/events";
import { ACCENT_FILL_CLASS } from "@/lib/styles";

function EventCard({
  event,
  saved,
  onToggleSaved,
}: {
  event: EventItem;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  const date = eventDate(event).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    // tabIndex makes the details reachable by keyboard focus and by tapping on touch screens.
    <li
      tabIndex={0}
      className="group relative h-64 overflow-hidden rounded-3xl text-left text-white outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ background: eventBackground(event) }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${ACCENT_FILL_CLASS}`}>
          {event.category}
        </span>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{event.title}</h2>
        <p className="mt-1 text-sm text-white/85">{event.subtitle}</p>
      </div>

      {/* Details, revealed on hover / focus. */}
      <div className="absolute inset-0 flex flex-col justify-center gap-3 bg-black/85 p-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100">
        <p className="text-sm">{event.description}</p>
        <dl className="space-y-1.5 text-sm text-white/85">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Provider</dt>
            <StoreIcon className="size-4 shrink-0" aria-hidden />
            <dd>{event.provider}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Artist</dt>
            <MicIcon className="size-4 shrink-0" aria-hidden />
            <dd>{event.artist}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Location</dt>
            <MapPinIcon className="size-4 shrink-0" aria-hidden />
            <dd>{event.location}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Date</dt>
            <CalendarIcon className="size-4 shrink-0" aria-hidden />
            <dd>{date}</dd>
          </div>
        </dl>
      </div>

      {/* Last in the card so it stays clickable above the hover details. */}
      <SaveEventButton
        event={event}
        saved={saved}
        onToggle={onToggleSaved}
        className="absolute top-3 right-3 size-9"
      />
    </li>
  );
}

export default function EventSearch() {
  const search = useEventSearch();
  const { results } = search;
  const saved = useSavedEvents();

  return (
    <div>
      <EventSearchControls search={search} />

      {saved.error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {saved.error}
        </p>
      )}

      <div className="mt-10" aria-live="polite">
        {results === null ? (
          <p className="text-muted-foreground">
            Type something and press Enter, or pick a filter, to see events.
          </p>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground">{searchSummary(search)}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{searchSummary(search)}</p>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2">
              {results.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  saved={saved.isSaved(event.id)}
                  onToggleSaved={() => saved.toggle(event.id)}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
