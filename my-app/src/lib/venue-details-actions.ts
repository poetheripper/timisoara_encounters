"use server";

import { NOT_A_VENUE, SAVE_FAILED, currentVenueId } from "@/lib/venue-auth";
import { cleanVenueLocation, type VenueLocation } from "@/lib/venue-location";
import { cleanVenueSchedule, type VenueSchedule } from "@/lib/venue-schedule";
import { createClient } from "@/utils/supabase/server";

type Failed = { ok: false; error: string };

async function saveColumn(venueId: string, column: "location" | "schedule", value: unknown) {
  const supabase = createClient();
  const { error } = await supabase.from("users").update({ [column]: value }).eq("id", venueId);
  if (error) console.error(`save venue ${column} error:`, error.message);
  return !error;
}

/** Replaces the location of the logged-in venue. Returns it as stored (null = removed). */
export async function saveVenueLocation(
  raw: VenueLocation | null,
): Promise<{ ok: true; location: VenueLocation | null } | Failed> {
  const venueId = await currentVenueId();
  if (!venueId) return NOT_A_VENUE;

  const cleaned = cleanVenueLocation(raw);
  if (!cleaned.ok) return cleaned;
  if (!(await saveColumn(venueId, "location", cleaned.location))) return SAVE_FAILED;
  return cleaned;
}

/** Replaces the opening hours of the logged-in venue. Returns them as stored (null = removed). */
export async function saveVenueSchedule(
  raw: VenueSchedule | null,
): Promise<{ ok: true; schedule: VenueSchedule | null } | Failed> {
  const venueId = await currentVenueId();
  if (!venueId) return NOT_A_VENUE;

  const cleaned = cleanVenueSchedule(raw);
  if (!cleaned.ok) return cleaned;
  if (!(await saveColumn(venueId, "schedule", cleaned.schedule))) return SAVE_FAILED;
  return cleaned;
}
