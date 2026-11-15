"use server";

import { auth0 } from "@/lib/auth0";
import {
  BIO_MAX,
  IMAGE_KINDS,
  IMAGE_MAX_BYTES,
  INTERESTS,
  PROFILE_IMAGES_BUCKET,
  imageFolder,
  nameProblem,
  usernameProblem,
  type ImageKind,
} from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_SIGNED_IN = { ok: false, error: "You need to be logged in." } as const;
const SAVE_FAILED = { ok: false, error: "Could not save. Please try again." } as const;

// Server actions can be called directly, so each one checks the session itself
// and only ever touches the rows of the logged-in user.
async function currentUserId() {
  const session = await auth0.getSession();
  return session?.user?.sub ?? null;
}

export type ProfileText = { name: string; username: string; bio: string };

export async function saveProfile(raw: ProfileText): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const name = String(raw?.name ?? "").trim();
  const username = String(raw?.username ?? "").trim();
  const bio = String(raw?.bio ?? "").trim();

  const problem =
    nameProblem(name) ??
    // The username is optional; an empty one is stored as "no username".
    (username === "" ? null : usernameProblem(username)) ??
    (bio.length > BIO_MAX ? `Keep the description under ${BIO_MAX} characters.` : null);
  if (problem) return { ok: false, error: problem };

  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ name, username: username === "" ? null : username, bio: bio === "" ? null : bio })
    .eq("id", userId);
  if (error) {
    // 23505 = unique violation: someone else already has this username.
    if (error.code === "23505") return { ok: false, error: "That username is already taken." };
    console.error("saveProfile error:", error.message);
    return SAVE_FAILED;
  }
  return { ok: true };
}

export type ImageResult = { ok: true; url: string | null } | { ok: false; error: string };

const IMAGE_COLUMN: Record<ImageKind, "avatar_url" | "cover_url"> = {
  avatar: "avatar_url",
  cover: "cover_url",
};

// Each user has one fixed file per picture, so a new upload replaces the old one.
function imagePath(userId: string, kind: ImageKind) {
  return `${imageFolder(userId)}/${kind}.jpg`;
}

function isImageKind(kind: unknown): kind is ImageKind {
  return IMAGE_KINDS.includes(kind as ImageKind);
}

/** Expects form fields `kind` ("avatar" | "cover") and `file` (a JPEG prepared by the dashboard). */
export async function uploadProfileImage(formData: FormData): Promise<ImageResult> {
  const userId = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const kind = formData.get("kind");
  const file = formData.get("file");
  if (!isImageKind(kind) || !(file instanceof Blob)) {
    return { ok: false, error: "That upload was not valid." };
  }
  if (file.type !== "image/jpeg") return { ok: false, error: "That image type isn't supported." };
  if (file.size === 0 || file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: "That image is too large." };
  }

  const supabase = createClient();
  const path = imagePath(userId, kind);
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(path, file, { upsert: true, contentType: "image/jpeg" });
  if (uploadError) {
    console.error("uploadProfileImage storage error:", uploadError.message);
    return { ok: false, error: "Could not upload the picture. Please try again." };
  }

  // The path never changes, so the version makes browsers fetch the new picture.
  const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error } = await supabase.from("users").update({ [IMAGE_COLUMN[kind]]: url }).eq("id", userId);
  if (error) {
    console.error("uploadProfileImage save error:", error.message);
    return SAVE_FAILED;
  }
  return { ok: true, url };
}

export async function removeProfileImage(kind: ImageKind): Promise<ImageResult> {
  const userId = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  if (!isImageKind(kind)) return { ok: false, error: "That request was not valid." };

  const supabase = createClient();
  const { error } = await supabase.from("users").update({ [IMAGE_COLUMN[kind]]: null }).eq("id", userId);
  if (error) {
    console.error("removeProfileImage error:", error.message);
    return SAVE_FAILED;
  }

  // The profile no longer points at the file; failing to delete it only leaves an unused file behind.
  const { error: removeError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .remove([imagePath(userId, kind)]);
  if (removeError) console.error("removeProfileImage storage error:", removeError.message);

  return { ok: true, url: null };
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
