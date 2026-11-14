"use server";

import { auth0 } from "@/lib/auth0";
import { EVENTS } from "@/lib/events";
import { createClient } from "@/utils/supabase/server";

export type SaveResult = { ok: true } | { ok: false; error: string };

// Server actions can be called directly, so each one checks the session itself
// and only ever touches the rows of the logged-in user.
async function currentUserId() {
  const session = await auth0.getSession();
  return session?.user?.sub ?? null;
}

/** Ids of the events the logged-in user saved. Empty when logged out. */
export async function getSavedEventIds(): Promise<string[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("saved_events")
    .select("event_id")
    .eq("user_id", userId);
  if (error) {
    console.error("getSavedEventIds error:", error.message);
    return [];
  }
  return data.map((row) => row.event_id);
}

/** Saves an event to the logged-in user's profile, or removes it. */
export async function setEventSaved(eventId: string, saved: boolean): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Log in to save events." };

  if (!EVENTS.some((event) => event.id === eventId)) {
    return { ok: false, error: "That event no longer exists." };
  }

  const supabase = createClient();
  const { error } = saved
    ? await supabase
        .from("saved_events")
        .upsert({ user_id: userId, event_id: eventId }, { onConflict: "user_id,event_id" })
    : await supabase.from("saved_events").delete().eq("user_id", userId).eq("event_id", eventId);
  if (error) {
    console.error("setEventSaved error:", error.message);
    return { ok: false, error: "Could not save. Please try again." };
  }
  return { ok: true };
}
