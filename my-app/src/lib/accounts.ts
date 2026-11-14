// Public artist and venue accounts: what the search suggestions and profile pages share.

export type PublicRole = "artist" | "venue";

/** Roles (as stored in users.role) whose profiles are public. "provider" is the old name for venues. */
export const PUBLIC_DB_ROLES = ["artist", "venue", "provider"];

export const ROLE_LABEL: Record<PublicRole, string> = { artist: "Artist", venue: "Venue" };

/** The public role for a stored role, or null when that account has no public profile. */
export function publicRole(dbRole: unknown): PublicRole | null {
  if (dbRole === "artist") return "artist";
  if (dbRole === "venue" || dbRole === "provider") return "venue";
  return null;
}

export type AccountSummary = {
  /** What identifies the account in its profile address: the username, or the account id without one. */
  handle: string;
  name: string;
  username: string | null;
  role: PublicRole;
  avatarUrl: string | null;
};

export function profileHref(handle: string) {
  return `/profile/${encodeURIComponent(handle)}`;
}

/** Name to show for an account that may not have filled one in. */
export function displayName(name: string | null | undefined, username: string | null | undefined) {
  return name?.trim() || username || "Unnamed account";
}
