"use server";

import { auth0 } from "@/lib/auth0";
import { INTERESTS, nameProblem } from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_SIGNED_IN: ActionResult = { ok: false, error: "You need to be logged in." };
const SAVE_FAILED: ActionResult = { ok: false, error: "Could not save. Please try again." };

// Server actions can be called directly, so each one checks the session itself
// and only ever touches the rows of the logged-in user.
async function currentUserId() {
  const session = await auth0.getSession();
  return session?.user?.sub ?? null;
}

export async function saveName(rawName: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const name = String(rawName).trim();
  const problem = nameProblem(name);
  if (problem) return { ok: false, error: problem };

  const supabase = createClient();
  const { error } = await supabase.from("users").update({ name }).eq("id", userId);
  if (error) {
    console.error("saveName error:", error.message);
    return SAVE_FAILED;
  }
  return { ok: true };
}

export async function saveInterests(rawInterests: string[]): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;

  // Keep only known interests, in their canonical order.
  const picked = new Set(Array.isArray(rawInterests) ? rawInterests : []);
  const interests = INTERESTS.filter((interest) => picked.has(interest));

  const supabase = createClient();
  const { error } = await supabase.from("users").update({ interests }).eq("id", userId);
  if (error) {
    console.error("saveInterests error:", error.message);
    return SAVE_FAILED;
  }
  return { ok: true };
}
