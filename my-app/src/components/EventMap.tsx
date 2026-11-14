"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AdvancedMarker, APIProvider, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { CalendarIcon, MapPinIcon, MicIcon, StoreIcon, XIcon } from "lucide-react";
import EventSearchControls, { searchSummary, useEventSearch } from "@/components/EventSearchControls";
import SaveEventButton, { useSavedEvents } from "@/components/SaveEventButton";
import { eventDate, type EventItem } from "@/lib/events";
import { ACCENT_FILL_CLASS } from "@/lib/styles";

// Set these in .env.local. The key must have the "Maps JavaScript API" enabled.
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// Markers need a map ID. Google's demo ID works for development; create your own for production.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

const TIMISOARA = { lat: 45.7558, lng: 21.2287 };
const DEFAULT_ZOOM = 14;
const NO_EVENTS: EventItem[] = [];

// Pin colors per theme, matching the accent purple in src/lib/styles.ts.
const PIN_COLORS = {
  light: { background: "#4E418C", border: "#372D66", glyph: "#FFFFFF" },
  dark: { background: "#B9ADEB", border: "#FFFFFF", glyph: "#1F1A3D" },
};

// The theme is the `dark` class on <html> (see ThemeToggle), so watch that class.
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function useIsDark() {
  return useSyncExternalStore(
    subscribeToTheme,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

/** Moves the camera so every result is in view. Runs only when the results change. */
function FitToEvents({ events }: { events: EventItem[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || events.length === 0) return;
    if (events.length === 1) {
      map.panTo(events[0].coordinates);
      map.setZoom(16);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    events.forEach((event) => bounds.extend(event.coordinates));
    map.fitBounds(bounds, 80);
  }, [map, events]);

  return null;
}

function EventDetails({
  event,
  saved,
  onToggleSaved,
  onClose,
}: {
  event: EventItem;
  saved: boolean;
  onToggleSaved: () => void;
  onClose: () => void;
}) {
  const date = eventDate(event).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-border bg-popover p-4 text-left text-popover-foreground shadow-lg sm:right-auto sm:w-80">
      <button
        type="button"
        aria-label="Close event details"
        onClick={onClose}
        className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <XIcon className="size-4" />
      </button>
      <SaveEventButton
        event={event}
        saved={saved}
        onToggle={onToggleSaved}
        variant="plain"
        className="absolute top-3 right-11 size-7"
      />
      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${ACCENT_FILL_CLASS}`}>
        {event.category}
      </span>
      <h2 className="mt-2 text-lg font-semibold tracking-tight">{event.title}</h2>
      <p className="mt-1 text-sm">{event.description}</p>
      <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
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
  );
}

export default function EventMap() {
  const search = useEventSearch();
  const saved = useSavedEvents();
  const isDark = useIsDark();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const results = search.results ?? NO_EVENTS;
  // Derived from the results, so the details close by themselves when a new search drops the event.
  const selected = results.find((event) => event.id === selectedId) ?? null;
  const pin = isDark ? PIN_COLORS.dark : PIN_COLORS.light;

  return (
    <div>
      <EventSearchControls search={search} />

      <p className="mt-8 text-sm text-muted-foreground" aria-live="polite">
        {search.results === null
          ? "Type something and press Enter, or pick a filter, to see events on the map."
          : searchSummary(search)}
      </p>

      {saved.error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {saved.error}
        </p>
      )}

      <div className="relative mt-4 h-[60dvh] min-h-80 overflow-hidden rounded-3xl border border-border bg-muted">
        {API_KEY === "" ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="font-medium text-foreground">Google Maps API key missing</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Add <code className="rounded bg-border px-1 py-0.5">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
              to <code className="rounded bg-border px-1 py-0.5">.env.local</code> and restart the dev
              server to show the map.
            </p>
          </div>
        ) : (
          <APIProvider apiKey={API_KEY}>
            {/* The color scheme can only be set when a map is created, so the key re-creates it on theme change. */}
            <Map
              key={isDark ? "dark" : "light"}
              mapId={MAP_ID}
              colorScheme={isDark ? "DARK" : "LIGHT"}
              defaultCenter={TIMISOARA}
              defaultZoom={DEFAULT_ZOOM}
              gestureHandling="cooperative"
              streetViewControl={false}
              mapTypeControl={false}
              fullscreenControl={false}
              clickableIcons={false}
              onClick={() => setSelectedId(null)}
            >
              <FitToEvents events={results} />
              {results.map((event) => (
                <AdvancedMarker
                  key={event.id}
                  position={event.coordinates}
                  title={event.title}
                  zIndex={event.id === selectedId ? 1 : 0}
                  onClick={() => setSelectedId(event.id)}
                >
                  <Pin
                    background={pin.background}
                    borderColor={pin.border}
                    glyphColor={pin.glyph}
                    scale={event.id === selectedId ? 1.3 : 1}
                  />
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        )}

        {selected && (
          <EventDetails
            event={selected}
            saved={saved.isSaved(selected.id)}
            onToggleSaved={() => saved.toggle(selected.id)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}
