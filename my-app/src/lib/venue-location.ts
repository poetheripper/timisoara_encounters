// Where a venue is: its full address and, optionally, the exact point on the map.
// Shared by the venue dashboard, the public profile page and the server action that saves it.

export type LatLng = { lat: number; lng: number };

export type VenueLocation = {
  address: string;
  /** The exact point on the map; null when the venue only filled in the address. */
  coordinates: LatLng | null;
};

export const ADDRESS_MAX = 200;

function cleanCoordinates(raw: unknown): LatLng | null {
  const input = (raw ?? {}) as Record<string, unknown>;
  const { lat, lng } = input;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Validates and cleans a location before saving. An empty address means "no location". */
export function cleanVenueLocation(
  raw: unknown,
): { ok: true; location: VenueLocation | null } | { ok: false; error: string } {
  const input = (raw ?? {}) as Record<string, unknown>;
  const address = String(input.address ?? "").trim();
  const coordinates = cleanCoordinates(input.coordinates);

  if (address === "") {
    if (coordinates) return { ok: false, error: "Enter the address that goes with the pin." };
    return { ok: true, location: null };
  }
  if (address.length > ADDRESS_MAX) {
    return { ok: false, error: `Keep the address under ${ADDRESS_MAX} characters.` };
  }
  return { ok: true, location: { address, coordinates } };
}

/** The location as stored in the database, or null when there is none (or it is not valid). */
export function storedVenueLocation(raw: unknown): VenueLocation | null {
  const cleaned = cleanVenueLocation(raw);
  return cleaned.ok ? cleaned.location : null;
}

/** Link that opens the place in the real Google Maps (web or app). */
export function googleMapsHref(location: VenueLocation) {
  const query = location.coordinates
    ? `${location.coordinates.lat},${location.coordinates.lng}`
    : location.address;
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query })}`;
}
