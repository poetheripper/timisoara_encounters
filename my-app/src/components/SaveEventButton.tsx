"use client";

import { useEffect, useState, useTransition } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { BookmarkIcon } from "lucide-react";
import { getSavedEventIds, setEventSaved } from "@/lib/saved-events-actions";
import type { EventItem } from "@/lib/events";

/**
 * The logged-in user's saved events, plus a way to save / unsave one.
 * Use it once per page and hand `isSaved` / `toggle` to each <SaveEventButton>.
 *
 * @param initialIds Pass the saved ids when the page already loaded them on the server;
 *                   otherwise they are fetched once the user is known.
 */
export function useSavedEvents(initialIds?: string[]) {
  const { user } = useUser();
  const [savedIds, setSavedIds] = useState<string[]>(initialIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isLoggedIn = Boolean(user);
  const shouldFetch = isLoggedIn && initialIds === undefined;

  useEffect(() => {
    if (!shouldFetch) return;
    let cancelled = false;
    getSavedEventIds().then((ids) => {
      if (!cancelled) setSavedIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldFetch]);

  // Updates the list straight away; it is put back if saving fails.
  const toggle = (eventId: string) => {
    if (!isLoggedIn) {
      setError("Log in to save events.");
      return;
    }
    const previous = savedIds;
    const saved = !savedIds.includes(eventId);
    setSavedIds(saved ? [...savedIds, eventId] : savedIds.filter((id) => id !== eventId));
    setError(null);
    startTransition(async () => {
      const result = await setEventSaved(eventId, saved);
      if (!result.ok) {
        setSavedIds(previous);
        setError(result.error);
      }
    });
  };

  return {
    savedIds,
    isSaved: (eventId: string) => savedIds.includes(eventId),
    toggle,
    /** Why the last save failed (e.g. not logged in); null when all is well. */
    error,
  };
}

const VARIANT_CLASS = {
  // Sits on top of an event image, so it keeps the same look in both themes.
  overlay: "bg-white/85 text-black shadow backdrop-blur hover:bg-white",
  // Sits on a themed surface (card, popover).
  plain: "text-muted-foreground hover:bg-muted hover:text-foreground",
};

/** Bookmark toggle that saves an event to the user's profile. */
export default function SaveEventButton({
  event,
  saved,
  onToggle,
  variant = "overlay",
  className = "",
}: {
  event: EventItem;
  saved: boolean;
  onToggle: () => void;
  variant?: keyof typeof VARIANT_CLASS;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${event.title} from saved` : `Save ${event.title}`}
      title={saved ? "Remove from saved" : "Save"}
      className={`flex items-center justify-center rounded-full transition ${VARIANT_CLASS[variant]} ${className}`}
    >
      <BookmarkIcon className={`size-4 ${saved ? "fill-current" : ""}`} />
    </button>
  );
}
