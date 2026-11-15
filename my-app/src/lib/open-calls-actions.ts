"use server";

import { APPLICATION_MESSAGE_MAX } from "@/lib/open-calls";
import { currentAccount } from "@/lib/open-calls-data";
import { todayDay } from "@/lib/venue-posts";
import { createClient } from "@/utils/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const NOT_VALID = { ok: false, error: "That request was not valid." } as const;

/**
 * Applies the logged-in artist to an open call, with an optional note for the venue.
 * Server actions can be called directly, so the role is checked here, not only in the page.
 */
export async function applyToOpenCall(postId: string, rawMessage: string): Promise<Result> {
  const account = await currentAccount();
  if (!account) return { ok: false, error: "Log in as an artist to apply." };
  if (account.role !== "artist") return { ok: false, error: "Only artist accounts can apply." };

  if (!/^[0-9a-f-]{36}$/i.test(String(postId))) return NOT_VALID;
  const message = String(rawMessage ?? "").trim();
  if (message.length > APPLICATION_MESSAGE_MAX) {
    return { ok: false, error: `Keep the message under ${APPLICATION_MESSAGE_MAX} characters.` };
  }

  const supabase = createClient();
  const { data: post, error: postError } = await supabase
    .from("venue_posts")
    .select("date")
    .eq("id", postId)
    .eq("kind", "open_call")
    .maybeSingle();
  if (postError) {
    console.error("applyToOpenCall post error:", postError.message);
    return { ok: false, error: "Could not apply. Please try again." };
  }
  if (!post) return { ok: false, error: "That open call no longer exists." };
  if (post.date < todayDay()) return { ok: false, error: "The deadline of that open call has passed." };

  const { error } = await supabase
    .from("open_call_applications")
    .insert({ post_id: postId, artist_id: account.id, message: message || null });
  if (error) {
    // 23505: the (post, artist) pair already exists.
    if (error.code === "23505") return { ok: false, error: "You already applied to this open call." };
    console.error("applyToOpenCall error:", error.message);
    return { ok: false, error: "Could not apply. Please try again." };
  }
  return { ok: true };
}

/** Marks every notification of the logged-in account as read. */
export async function markNotificationsRead(): Promise<Result> {
  const account = await currentAccount();
  if (!account) return { ok: false, error: "Log in first." };

  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ notifications_seen_at: new Date().toISOString() })
    .eq("id", account.id);
  if (error) {
    console.error("markNotificationsRead error:", error.message);
    return { ok: false, error: "Could not save. Please try again." };
  }
  return { ok: true };
}
