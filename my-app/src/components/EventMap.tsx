"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  Polyline,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LocateFixedIcon,
  MapPinIcon,
  MicIcon,
  StoreIcon,
  XIcon,
} from "lucide-react";
import EventSearchControls, {
  FilterChip,
  searchSummary,
  useEventSearch,
} from "@/components/EventSearchControls";
import SaveEventButton, { useSavedEvents } from "@/components/SaveEventButton";
import { eventDate, type EventItem } from "@/lib/events";
import { ACCENT_FILL_CLASS } from "@/lib/styles";

// Set these in .env.local. The key must have the "Maps JavaScript API" enabled,
// plus the "Routes API" for drawing routes and their travel times.
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// Markers need a map ID. Google's demo ID works for development; create your own for production.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

const TIMISOARA = { lat: 45.7558, lng: 21.2287 };
const DEFAULT_ZOOM = 14;
const NO_EVENTS: EventItem[] = [];

// Pin colors per theme, matching the accent purple in src/lib/styles.ts.
const PIN_COLORS = {
  light: { background: "#4E418C", border: "#372D66", glyph: "#FFFFFF", line: "#4E418C" },
  dark: { background: "#B9ADEB", border: "#FFFFFF", glyph: "#1F1A3D", line: "#B9ADEB" },
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

// ---- Route planning -------------------------------------------------------------------------

const TRAVEL_MODES = [
  { id: "WALKING", label: "Walking route", noun: "Walking", urlMode: "walking" },
  { id: "DRIVING", label: "Driving route", noun: "Driving", urlMode: "driving" },
] as const;
type TravelModeId = (typeof TRAVEL_MODES)[number]["id"];

// ✏️ Travel-time limits offered as chips, in minutes.
const TIME_LIMITS_MIN = [15, 30, 60];

type LatLng = { lat: number; lng: number };
/** A point on the route: an event, or the user's own location as the starting point. */
type RouteStop = { id: string; title: string; location: string; coordinates: LatLng };

const MY_LOCATION_ID = "my-location";

// Where the browser's location stands: not asked yet, being asked, known, refused / failed, or switched off.
const NO_STOPS: RouteStop[] = [];

type LocationState =
  | { status: "idle" | "asking" | "off" }
  | { status: "failed"; reason: string }
  | { status: "on"; coordinates: LatLng };
type RouteLeg = { durationMillis: number | null; distanceMeters: number; path: LatLng[] };
/** Outcome of one route request; `key` says which stops + travel mode it belongs to. */
type RouteResult = { key: string; legs: RouteLeg[] | null; fullPath: LatLng[] };

function squaredDistance(a: LatLng, b: LatLng) {
  // Good enough to compare distances within one city.
  const dLat = a.lat - b.lat;
  const dLng = (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180);
  return dLat * dLat + dLng * dLng;
}

/**
 * Visiting order: always go to the closest event not visited yet.
 * Starts from `start` (the user's location) when given, otherwise at the first event.
 */
function orderStops(events: EventItem[], start: LatLng | null) {
  if (events.length < (start ? 2 : 3)) return events;
  const remaining = start ? events.slice() : events.slice(1);
  const ordered = start ? [] : [events[0]];
  while (remaining.length > 0) {
    const from = ordered.length > 0 ? ordered[ordered.length - 1].coordinates : (start as LatLng);
    let closest = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (
        squaredDistance(from, remaining[i].coordinates) <
        squaredDistance(from, remaining[closest].coordinates)
      ) {
        closest = i;
      }
    }
    ordered.push(...remaining.splice(closest, 1));
  }
  return ordered;
}

function formatDuration(millis: number) {
  const minutes = Math.max(1, Math.round(millis / 60000));
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${rest} min`;
}

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatLimit(minutes: number) {
  return minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? "" : "s"}` : `${minutes} min`;
}

/** Link that opens the same route in the real Google Maps (web or app). */
function googleMapsUrl(stops: RouteStop[], urlMode: string) {
  const point = (event: RouteStop) => `${event.coordinates.lat},${event.coordinates.lng}`;
  const params = new URLSearchParams({
    api: "1",
    origin: point(stops[0]),
    destination: point(stops[stops.length - 1]),
    travelmode: urlMode,
  });
  const between = stops.slice(1, -1);
  if (between.length > 0) params.set("waypoints", between.map(point).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

/**
 * Asks Google for the route through the stops, in order, and reports it with `onResult`.
 * Renders nothing; it lives inside the map so it can use the Maps libraries.
 */
function RouteLoader({
  requestKey,
  stops,
  mode,
  onResult,
}: {
  requestKey: string;
  stops: RouteStop[];
  mode: TravelModeId;
  onResult: (result: RouteResult) => void;
}) {
  const routesLibrary = useMapsLibrary("routes");

  useEffect(() => {
    if (!routesLibrary) return;
    let cancelled = false;

    routesLibrary.Route.computeRoutes({
      origin: stops[0].coordinates,
      destination: stops[stops.length - 1].coordinates,
      intermediates: stops.slice(1, -1).map((stop) => ({ location: stop.coordinates })),
      travelMode: mode,
      fields: ["legs", "path"],
    })
      .then(({ routes }) => {
        if (cancelled) return;
        const route = routes?.[0];
        const legs = route?.legs;
        if (!legs || legs.length !== stops.length - 1) throw new Error("Unexpected route shape");
        onResult({
          key: requestKey,
          fullPath: (route?.path ?? []).map((p) => ({ lat: p.lat, lng: p.lng })),
          legs: legs.map((leg) => ({
            durationMillis: leg.durationMillis,
            distanceMeters: leg.distanceMeters,
            path: leg.path.map((p) => ({ lat: p.lat, lng: p.lng })),
          })),
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Route request failed:", error);
        onResult({ key: requestKey, legs: null, fullPath: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [routesLibrary, requestKey, stops, mode, onResult]);

  return null;
}

function CopyLinkRow({ url }: { url: string }) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const copied = copiedUrl === url;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
    } catch {
      // Clipboard blocked (permissions, insecure origin): the link stays selectable in the field.
      setCopiedUrl(null);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <input
        readOnly
        value={url}
        aria-label="Google Maps link for this route"
        onFocus={(e) => e.target.select()}
        className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={copy}
        className={`flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition ${ACCENT_FILL_CLASS}`}
      >
        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-11 items-center gap-2 rounded-full border border-border bg-muted px-5 text-sm text-foreground transition hover:bg-border"
      >
        <ExternalLinkIcon className="size-4" />
        Open in Google Maps
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

/** Moves the camera so every point is in view. Runs only when the points change. */
function FitToPoints({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(16);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 80);
  }, [map, points]);

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

  // Route planning: off until a travel mode is picked.
  const [modeId, setModeId] = useState<TravelModeId | null>(null);
  const [limitMin, setLimitMin] = useState<number | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  // The user's location, used as the start of the route. Asked for the first time a travel mode is picked.
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const myLocation = location.status === "on" ? location.coordinates : null;

  const requestLocation = () => {
    // Browsers only share the location on https pages and on localhost / 127.0.0.1.
    if (!window.isSecureContext) {
      setLocation({
        status: "failed",
        reason:
          "Browsers only share your location on https pages or on localhost. Open the site as http://localhost:3000 instead of an IP address.",
      });
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocation({ status: "failed", reason: "This browser can't share a location." });
      return;
    }
    setLocation({ status: "asking" });
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setLocation({
          status: "on",
          coordinates: { lat: position.coords.latitude, lng: position.coords.longitude },
        }),
      (error) =>
        setLocation({
          status: "failed",
          reason:
            error.code === error.PERMISSION_DENIED
              ? "Location is blocked for this site. Allow it from the icon at the left of the address bar, and check that your system lets the browser use location."
              : error.code === error.TIMEOUT
                ? "Finding your location took too long."
                : "Your device couldn't work out where it is (no location service answered).",
        }),
      { timeout: 20000, maximumAge: 60000 },
    );
  };

  const mode = TRAVEL_MODES.find((m) => m.id === modeId) ?? null;
  // The route visits the events in this order, starting from the user's location when it is known.
  const stops = useMemo<RouteStop[]>(() => {
    const ordered = orderStops(results, myLocation);
    if (!myLocation) return ordered;
    const start: RouteStop = {
      id: MY_LOCATION_ID,
      title: "Your location",
      location: "Starting point",
      coordinates: myLocation,
    };
    return [start, ...ordered];
  }, [results, myLocation]);
  // Everything the camera should keep in view.
  const fitPoints = useMemo(
    () => [...(myLocation ? [myLocation] : []), ...results.map((event) => event.coordinates)],
    [results, myLocation],
  );
  const canRoute = mode !== null && stops.length >= 2;
  const routeKey = `${modeId}:${stops
    .map((stop) => `${stop.id}@${stop.coordinates.lat},${stop.coordinates.lng}`)
    .join(";")}`;
  // Only a result for the current stops and travel mode counts; anything else is still loading.
  const route = canRoute && routeResult?.key === routeKey ? routeResult : null;
  const routeLoading = canRoute && route === null && API_KEY !== "";
  const legs = route?.legs ?? null;

  // With a time limit, keep the stops that can be reached within it, counted from the first stop.
  let stopCount = stops.length;
  if (legs && limitMin !== null) {
    let elapsed = 0;
    stopCount = 1;
    for (const leg of legs) {
      elapsed += leg.durationMillis ?? 0;
      if (elapsed > limitMin * 60000) break;
      stopCount++;
    }
  }
  const routeStops = canRoute ? stops.slice(0, stopCount) : NO_STOPS;
  const routeLegs = legs ? legs.slice(0, stopCount - 1) : [];
  const hasRoute = routeStops.length >= 2;
  const totalMillis = routeLegs.reduce((sum, leg) => sum + (leg.durationMillis ?? 0), 0);
  const totalMeters = routeLegs.reduce((sum, leg) => sum + leg.distanceMeters, 0);
  // The line follows the roads leg by leg. If Google sent no per-leg path, use the path of the whole
  // route when every stop is on it, or straight lines between the stops as a last resort.
  let routePath = routeLegs.flatMap((leg) => leg.path);
  if (legs && routePath.length < 2) {
    routePath =
      stopCount === stops.length && route && route.fullPath.length > 1
        ? route.fullPath
        : routeStops.map((stop) => stop.coordinates);
  }
  // Events are numbered in visiting order; the user's location is the start and has no number.
  const routeEvents = routeStops.filter((stop) => stop.id !== MY_LOCATION_ID);
  const stopNumber = (eventId: string) => routeEvents.findIndex((stop) => stop.id === eventId) + 1;

  return (
    <div>
      <EventSearchControls search={search} />

      {/* Route options: pick a travel mode to connect the events on the map, optionally within a time limit. */}
      <div className="mt-3 space-y-3">
        <div role="group" aria-label="Route" className="flex flex-wrap justify-center gap-2">
          {TRAVEL_MODES.map((travelMode) => (
            <FilterChip
              key={travelMode.id}
              label={travelMode.label}
              selected={modeId === travelMode.id}
              onClick={() => {
                const turningOn = modeId !== travelMode.id;
                setModeId(turningOn ? travelMode.id : null);
                // First time a route is asked for: ask the browser for the user's location.
                if (turningOn && location.status === "idle") requestLocation();
              }}
            />
          ))}
          <FilterChip
            label={location.status === "asking" ? "Finding your location…" : "From my location"}
            selected={location.status === "on"}
            onClick={() => {
              if (location.status === "on") setLocation({ status: "off" });
              else if (location.status !== "asking") requestLocation();
            }}
          />
        </div>
        {location.status === "failed" && (
          <p role="alert" className="text-sm text-destructive">
            {location.reason} The route starts at the first event for now; press &quot;From my
            location&quot; to try again.
          </p>
        )}
        {mode && (
          <div
            role="group"
            aria-label="Longest travel time"
            className="flex flex-wrap justify-center gap-2"
          >
            {TIME_LIMITS_MIN.map((minutes) => (
              <FilterChip
                key={minutes}
                label={`Up to ${formatLimit(minutes)}`}
                selected={limitMin === minutes}
                onClick={() => setLimitMin(limitMin === minutes ? null : minutes)}
              />
            ))}
          </div>
        )}
      </div>

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
              <FitToPoints points={fitPoints} />
              {myLocation && (
                <AdvancedMarker position={myLocation} title="Your location" zIndex={2}>
                  {/* A fixed blue dot with a white ring reads as "you are here" on both map themes. */}
                  <div className="size-4 translate-y-1/2 rounded-full border-2 border-white bg-[#4285F4] shadow-[0_0_0_4px_rgba(66,133,244,0.3)]" />
                </AdvancedMarker>
              )}
              {canRoute && mode && (
                <RouteLoader
                  requestKey={routeKey}
                  stops={stops}
                  mode={mode.id}
                  onResult={setRouteResult}
                />
              )}
              {hasRoute && routePath.length > 1 && (
                <Polyline
                  path={routePath}
                  strokeColor={pin.line}
                  strokeOpacity={0.9}
                  strokeWeight={5}
                  clickable={false}
                />
              )}
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
                    // Stops on the route show their position in the visiting order.
                    glyphText={hasRoute && stopNumber(event.id) > 0 ? String(stopNumber(event.id)) : undefined}
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

      {mode && (
        <div
          className="mt-4 rounded-3xl border border-border bg-card p-5 text-left text-card-foreground"
          aria-live="polite"
        >
          <h2 className="text-lg font-semibold tracking-tight">{mode.label}</h2>

          {!canRoute ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {myLocation
                ? "Search or pick filters that match at least one event to get a route from your location."
                : "Search or pick filters that match at least two events to get a route between them."}
            </p>
          ) : !hasRoute ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No {myLocation ? "" : "other "}event is within {formatLimit(limitMin ?? 0)} of{" "}
              {mode.noun.toLowerCase()} from {myLocation ? "your location" : stops[0].title}. Try a
              longer time or another travel mode.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                {myLocation ? "From your location · " : ""}
                {routeEvents.length} {routeEvents.length === 1 ? "stop" : "stops"}
                {legs && ` · ${formatDuration(totalMillis)} · ${formatDistance(totalMeters)}`}
                {routeLoading && " · calculating route…"}
                {routeStops.length < stops.length &&
                  ` · ${stops.length - routeStops.length} more outside the time limit`}
              </p>
              {route && !legs && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  The route couldn&apos;t be calculated, so it isn&apos;t drawn on the map and travel
                  times aren&apos;t available. The Google Maps link below still works.
                </p>
              )}

              <ol className="mt-4 space-y-2 text-sm">
                {routeStops.map((stop, i) => (
                  <li key={stop.id} className="flex items-center gap-3">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${ACCENT_FILL_CLASS}`}
                    >
                      {stop.id === MY_LOCATION_ID ? (
                        <LocateFixedIcon className="size-3.5" aria-label="Start" />
                      ) : (
                        stopNumber(stop.id)
                      )}
                    </span>
                    <span>
                      <span className="font-medium">{stop.title}</span>
                      <span className="text-muted-foreground"> · {stop.location}</span>
                      {i > 0 && routeLegs[i - 1]?.durationMillis != null && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatDuration(routeLegs[i - 1].durationMillis ?? 0)} from the previous stop
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>

              <CopyLinkRow url={googleMapsUrl(routeStops, mode.urlMode)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
