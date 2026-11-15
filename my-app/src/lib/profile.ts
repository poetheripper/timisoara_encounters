// Profile rules shared by the dashboard UI and the server actions that save it.

import { CATEGORIES } from "@/lib/events";

// Interests a user can pick: the same categories events are filtered by in the search,
// so recommendations can later match interests to events directly.
export const INTERESTS: readonly string[] = CATEGORIES;

export const NAME_MAX = 50;

/** Returns why a display name is not allowed, or null when it is fine. */
export function nameProblem(name: string): string | null {
  if (name.length === 0) return "Enter a name.";
  if (name.length > NAME_MAX) return `Use at most ${NAME_MAX} characters.`;
  return null;
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/** Returns why a username is not allowed, or null when it is fine. Uniqueness is checked when saving. */
export function usernameProblem(username: string): string | null {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Use ${USERNAME_MIN}–${USERNAME_MAX} characters for the username.`;
  }
  if (!/^[a-zA-Z0-9._]+$/.test(username)) {
    return "Use only letters, numbers, dots and underscores in the username.";
  }
  return null;
}

export const BIO_MAX = 300;

// Profile and cover pictures. They are shrunk in the browser before upload (see UserDashboard),
// so the stored files stay small whatever the user picks.
export const PROFILE_IMAGES_BUCKET = "profile-images";
export const IMAGE_KINDS = ["avatar", "cover"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];
/** Largest upload the server accepts, in bytes. Must stay under Next's 1 MB server action limit. */
export const IMAGE_MAX_BYTES = 800 * 1024;

/** Each account keeps its pictures in its own folder. Auth0 ids contain characters such as "|" that storage paths do not accept. */
export function imageFolder(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}
