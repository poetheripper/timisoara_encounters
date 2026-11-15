"use client";

import { useState } from "react";
import { EventFilterChips } from "@/components/EventSearchControls";
import SaveEventButton, { useSavedEvents } from "@/components/SaveEventButton";
import { ErrorText, Section } from "@/components/UserDashboard";
import { allEvents, eventBackground, searchEvents, type EventItem, type TimeFilterId } from "@/lib/events";
import { ACCENT_FILL_CLASS } from "@/lib/styles";

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function SavedTile({
  event,
  onRemove,
}: {
  event: EventItem;
  onRemove: () => void;
}) {
  return (
    <li
      className="relative h-44 overflow-hidden rounded-3xl text-left text-white"
      style={{ background: eventBackground(event) }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <SaveEventButton
        event={event}
        saved
        onToggle={onRemove}
        className="absolute top-3 right-3 size-9"
      />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${ACCENT_FILL_CLASS}`}>
          {event.category}
        </span>
        <h3 className="mt-2 text-lg font-semibold tracking-tight">{event.title}</h3>
        <p className="mt-0.5 text-sm text-white/85">{event.location}</p>
      </div>
    </li>
  );
}

/** The events the logged-in account saved, with the same filters as the search. */
export default function SavedEvents({
  initial,
  venueEvents,
}: {
  initial: string[];
  /** The events venues published, loaded by the page. */
  venueEvents: EventItem[];
}) {
  const saved = useSavedEvents(initial);
  const [categories, setCategories] = useState<string[]>([]);
  const [times, setTimes] = useState<TimeFilterId[]>([]);

  const savedEvents = allEvents(venueEvents).filter((event) => saved.isSaved(event.id));
  const visibleSaved = searchEvents({ categories, times }, savedEvents);

  return (
    <Section
      title="Saved"
      hint="Events you saved from the search or the map, filtered the same way as search."
    >
      <EventFilterChips
        categories={categories}
        times={times}
        onToggleCategory={(category) => setCategories((list) => toggle(list, category))}
        onToggleTime={(time) => setTimes((list) => toggle(list, time))}
        onClear={() => {
          setCategories([]);
          setTimes([]);
        }}
      />
      {saved.error && <ErrorText>{saved.error}</ErrorText>}

      <div className="mt-6" aria-live="polite">
        {savedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t saved any events yet. Use the bookmark on an event in the search or on
            the map.
          </p>
        ) : visibleSaved.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            None of your saved events match the selected filters.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {visibleSaved.map((event) => (
              <SavedTile key={event.id} event={event} onRemove={() => saved.toggle(event.id)} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
