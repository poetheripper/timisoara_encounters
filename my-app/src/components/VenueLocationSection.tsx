"use client";

import { useState, useTransition, type FormEvent } from "react";
import { SearchIcon } from "lucide-react";
import { ErrorText, FIELD_CLASS, Section } from "@/components/UserDashboard";
import VenueMap from "@/components/VenueMap";
import { API_KEY } from "@/lib/google-maps";
import { ACCENT_FILL_CLASS } from "@/lib/styles";
import { saveVenueLocation } from "@/lib/venue-details-actions";
import {
  ADDRESS_MAX,
  cleanVenueLocation,
  type LatLng,
  type VenueLocation,
} from "@/lib/venue-location";

const sameLocation = (a: VenueLocation | null, b: VenueLocation | null) =>
  a?.address === b?.address &&
  a?.coordinates?.lat === b?.coordinates?.lat &&
  a?.coordinates?.lng === b?.coordinates?.lng;

/** Looks an address up with Google's geocoder. Needs the "Geocoding API" enabled on the Maps key. */
async function findAddress(address: string): Promise<LatLng | null> {
  if (typeof google === "undefined") return null;
  try {
    const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
    const { results } = await new Geocoder().geocode({ address, region: "ro" });
    return results[0]?.geometry.location.toJSON() ?? null;
  } catch {
    return null;
  }
}

/** Dashboard section where a venue sets its address and the exact point on the map. */
export default function VenueLocationSection({ initial }: { initial: VenueLocation | null }) {
  const [address, setAddress] = useState(initial?.address ?? "");
  const [coordinates, setCoordinates] = useState(initial?.coordinates ?? null);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [finding, setFinding] = useState(false);
  const [pending, startTransition] = useTransition();

  const edited = () => {
    setError(null);
    setJustSaved(false);
  };

  const cleaned = cleanVenueLocation({ address, coordinates });
  const unchanged = cleaned.ok && sameLocation(cleaned.location, saved);

  const onFind = async () => {
    edited();
    setFinding(true);
    const found = await findAddress(address.trim());
    setFinding(false);
    if (found) setCoordinates(found);
    else setError("That address couldn't be found. Click the map to place the pin yourself.");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!cleaned.ok) {
      setError(cleaned.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveVenueLocation(cleaned.location);
      if (result.ok) {
        setSaved(result.location);
        setJustSaved(true);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Section
      title="Location"
      hint="Your full address and the exact spot on the map. Both are shown on your public profile."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="venue-address" className="text-sm text-muted-foreground">
            Full address
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="venue-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                edited();
              }}
              maxLength={ADDRESS_MAX}
              autoComplete="street-address"
              placeholder="Street and number, Timișoara"
              className={`${FIELD_CLASS} h-11 min-w-0 rounded-full`}
            />
            {API_KEY !== "" && (
              <button
                type="button"
                onClick={onFind}
                disabled={finding || address.trim() === ""}
                className="mt-1 flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
              >
                <SearchIcon className="size-4" />
                {finding ? "Searching…" : "Find on map"}
              </button>
            )}
          </div>
        </div>

        <div>
          <VenueMap
            position={coordinates}
            onPick={(position) => {
              setCoordinates(position);
              edited();
            }}
            label="Your venue"
            className="h-72 rounded-2xl"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {coordinates
              ? "Click the map or drag the pin to move it."
              : "Click the map to place the pin on your venue."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || unchanged}
            className={`h-11 rounded-full px-5 text-sm font-medium transition disabled:opacity-50 ${ACCENT_FILL_CLASS}`}
          >
            {pending ? "Saving…" : "Save location"}
          </button>
          {coordinates && (
            <button
              type="button"
              onClick={() => {
                setCoordinates(null);
                edited();
              }}
              className="h-11 rounded-full border border-border px-5 text-sm font-medium transition hover:bg-muted"
            >
              Remove pin
            </button>
          )}
          {justSaved && !error && (
            <p role="status" className="text-sm text-muted-foreground">
              {saved ? "Location saved." : "Location removed."}
            </p>
          )}
        </div>
        {error && <ErrorText>{error}</ErrorText>}
      </form>
    </Section>
  );
}
