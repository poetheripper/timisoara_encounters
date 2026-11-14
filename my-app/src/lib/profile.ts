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
