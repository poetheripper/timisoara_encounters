"use client";

import { useEffect } from "react";
import { AdvancedMarker, APIProvider, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { API_KEY, MAP_ID, PIN_COLORS, TIMISOARA, useIsDark } from "@/lib/google-maps";
import type { LatLng } from "@/lib/venue-location";

/** Keeps the pin in view when it is moved from outside the map (e.g. after looking up an address). */
function FollowPin({ position }: { position: LatLng | null }) {
  const map = useMap();
  const lat = position?.lat;
  const lng = position?.lng;
  useEffect(() => {
    if (map && lat !== undefined && lng !== undefined) map.panTo({ lat, lng });
  }, [map, lat, lng]);
  return null;
}

/**
 * A small map with one pin. Read-only by default; with `onPick` the pin can be placed by
 * clicking the map or dragging it. The shape and size come from `className`
 * (e.g. "aspect-square rounded-full" for a round map).
 */
export default function VenueMap({
  position,
  onPick,
  label,
  className = "",
}: {
  position: LatLng | null;
  onPick?: (position: LatLng) => void;
  /** Name of the place, read out for the pin. */
  label?: string;
  className?: string;
}) {
  const isDark = useIsDark();
  const pin = isDark ? PIN_COLORS.dark : PIN_COLORS.light;

  return (
    // `isolate` makes rounded corners clip the map in every browser.
    <div className={`isolate overflow-hidden border border-border bg-muted ${className}`}>
      {API_KEY === "" ? (
        <p className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
          The map is not available: the Google Maps API key is missing.
        </p>
      ) : (
        <APIProvider apiKey={API_KEY}>
          {/* The color scheme can only be set when a map is created, so the key re-creates it on theme change. */}
          <Map
            key={isDark ? "dark" : "light"}
            mapId={MAP_ID}
            colorScheme={isDark ? "DARK" : "LIGHT"}
            defaultCenter={position ?? TIMISOARA}
            defaultZoom={position ? 16 : 13}
            gestureHandling="cooperative"
            disableDefaultUI
            clickableIcons={false}
            onClick={onPick ? (e) => e.detail.latLng && onPick(e.detail.latLng) : undefined}
            className="size-full"
          >
            <FollowPin position={position} />
            {position && (
              <AdvancedMarker
                position={position}
                title={label}
                draggable={Boolean(onPick)}
                onDragEnd={onPick ? (e) => e.latLng && onPick(e.latLng.toJSON()) : undefined}
              >
                <Pin background={pin.background} borderColor={pin.border} glyphColor={pin.glyph} />
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>
      )}
    </div>
  );
}
