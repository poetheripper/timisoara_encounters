"use server";

import { IMAGE_MAX_BYTES, PROFILE_IMAGES_BUCKET, imageFolder } from "@/lib/profile";
import { NOT_A_VENUE, SAVE_FAILED, currentVenueId } from "@/lib/venue-auth";
import { cleanVenuePost, type VenuePost } from "@/lib/venue-posts";
import { createClient } from "@/utils/supabase/server";

// Banners live next to the venue's profile pictures, one file per post.
function bannerPath(venueId: string, postId: string) {
  return `${imageFolder(venueId)}/posts/${postId}.jpg`;
}

/**
 * Expects form fields `post` (the post as JSON) and, optionally, `banner`
 * (a JPEG prepared by the dashboard).
 */
export async function addVenuePost(
  formData: FormData,
): Promise<{ ok: true; post: VenuePost } | { ok: false; error: string }> {
  const venueId = await currentVenueId();
  if (!venueId) return NOT_A_VENUE;

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("post") ?? ""));
  } catch {
    return { ok: false, error: "That request was not valid." };
  }
  const cleaned = cleanVenuePost(raw);
  if (!cleaned.ok) return cleaned;

  const banner = formData.get("banner");
  if (banner !== null) {
    if (!(banner instanceof Blob) || banner.type !== "image/jpeg") {
      return { ok: false, error: "That image type isn't supported." };
    }
    if (banner.size === 0 || banner.size > IMAGE_MAX_BYTES) {
      return { ok: false, error: "That image is too large." };
    }
  }

  const supabase = createClient();
  // The id is chosen here so the banner can be stored under it before the post is saved.
  const id = crypto.randomUUID();
  let bannerUrl: string | null = null;
  if (banner instanceof Blob) {
    const path = bannerPath(venueId, id);
    const { error } = await supabase.storage
      .from(PROFILE_IMAGES_BUCKET)
      .upload(path, banner, { contentType: "image/jpeg" });
    if (error) {
      console.error("addVenuePost banner error:", error.message);
      return { ok: false, error: "Could not upload the banner. Please try again." };
    }
    bannerUrl = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("venue_posts")
    .insert({ id, venue_id: venueId, ...cleaned.post, banner_url: bannerUrl });
  if (error) {
    console.error("addVenuePost error:", error.message);
    // Don't leave the banner of a post that was never saved behind.
    if (bannerUrl) await supabase.storage.from(PROFILE_IMAGES_BUCKET).remove([bannerPath(venueId, id)]);
    return SAVE_FAILED;
  }
  return { ok: true, post: { id, ...cleaned.post, bannerUrl } };
}

export async function deleteVenuePost(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const venueId = await currentVenueId();
  if (!venueId) return NOT_A_VENUE;
  // Post ids are UUIDs; anything else must not end up in a storage path.
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false, error: "That request was not valid." };

  const supabase = createClient();
  const { error } = await supabase
    .from("venue_posts")
    .delete()
    .eq("id", id)
    .eq("venue_id", venueId);
  if (error) {
    console.error("deleteVenuePost error:", error.message);
    return { ok: false, error: "Could not delete. Please try again." };
  }

  // Failing to delete the banner only leaves an unused file behind.
  const { error: removeError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .remove([bannerPath(venueId, id)]);
  if (removeError) console.error("deleteVenuePost banner error:", removeError.message);

  return { ok: true };
}
