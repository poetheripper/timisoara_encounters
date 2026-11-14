"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { saveInterests, saveName } from "@/app/dashboard/user/actions";
import { EventFilterChips, FilterChip } from "@/components/EventSearchControls";
import SaveEventButton, { useSavedEvents } from "@/components/SaveEventButton";
import { EVENTS, eventBackground, searchEvents, type EventItem, type TimeFilterId } from "@/lib/events";
import { INTERESTS, NAME_MAX, nameProblem } from "@/lib/profile";
import { ACCENT_FILL_CLASS } from "@/lib/styles";

export type UserProfile = {
  name: string;
  email: string;
  interests: string[];
  savedEventIds: string[];
};

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-sm text-destructive">
      {children}
    </p>
  );
}

function ProfileSection({ profile }: { profile: UserProfile }) {
  const [name, setName] = useState(profile.name);
  const [savedName, setSavedName] = useState(profile.name);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const trimmed = name.trim();
  const unchanged = trimmed === savedName;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const problem = nameProblem(trimmed);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveName(trimmed);
      if (result.ok) {
        setSavedName(trimmed);
        setJustSaved(true);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Section title="Profile">
      <form onSubmit={onSubmit}>
        <label htmlFor="profile-name" className="text-sm text-muted-foreground">
          Name
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            id="profile-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
              setJustSaved(false);
            }}
            maxLength={NAME_MAX}
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={error !== null}
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={pending || unchanged || trimmed === ""}
            className={`h-11 rounded-full px-5 text-sm font-medium transition disabled:opacity-50 ${ACCENT_FILL_CLASS}`}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        {justSaved && !error && (
          <p role="status" className="mt-2 text-sm text-muted-foreground">
            Name saved.
          </p>
        )}
      </form>

      <dl className="mt-5 text-sm">
        <dt className="text-muted-foreground">Email</dt>
        <dd className="mt-1 font-medium break-all">{profile.email || "—"}</dd>
      </dl>
    </Section>
  );
}

function InterestsSection({ initial }: { initial: string[] }) {
  const [interests, setInterests] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Saved straight away on every toggle; the chip flips back if saving fails.
  const onToggle = (interest: string) => {
    const previous = interests;
    const next = toggle(interests, interest);
    setInterests(next);
    setError(null);
    startTransition(async () => {
      const result = await saveInterests(next);
      if (!result.ok) {
        setInterests(previous);
        setError(result.error);
      }
    });
  };

  return (
    <Section
      title="Interests"
      hint="Pick what you enjoy. We'll use this to recommend events to you."
    >
      <div role="group" aria-label="Your interests" className="flex flex-wrap gap-2">
        {INTERESTS.map((interest) => (
          <FilterChip
            key={interest}
            label={interest}
            selected={interests.includes(interest)}
            onClick={() => onToggle(interest)}
          />
        ))}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </Section>
  );
}

function SavedTile({
  event,
  onRemove,
}: {
  event: EventItem;
  onRemove: () => void;
}) {
  return (
    <li
      className="relative h-44 overflow-hidden rounded-3xl text-left text-white"
      style={{ background: eventBackground(event) }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <SaveEventButton
        event={event}
        saved
        onToggle={onRemove}
        className="absolute top-3 right-3 size-9"
      />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${ACCENT_FILL_CLASS}`}>
          {event.category}
        </span>
        <h3 className="mt-2 text-lg font-semibold tracking-tight">{event.title}</h3>
        <p className="mt-0.5 text-sm text-white/85">{event.location}</p>
      </div>
    </li>
  );
}

function SavedSection({ initial }: { initial: string[] }) {
  const saved = useSavedEvents(initial);
  const [categories, setCategories] = useState<string[]>([]);
  const [times, setTimes] = useState<TimeFilterId[]>([]);

  const savedEvents = EVENTS.filter((event) => saved.isSaved(event.id));
  const visibleSaved = searchEvents({ categories, times }, savedEvents);

  return (
    <Section
      title="Saved"
      hint="Events you saved from the search or the map, filtered the same way as search."
    >
      <EventFilterChips
        categories={categories}
        times={times}
        onToggleCategory={(category) => setCategories((list) => toggle(list, category))}
        onToggleTime={(time) => setTimes((list) => toggle(list, time))}
        onClear={() => {
          setCategories([]);
          setTimes([]);
        }}
      />
      {saved.error && <ErrorText>{saved.error}</ErrorText>}

      <div className="mt-6" aria-live="polite">
        {savedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t saved any events yet. Use the bookmark on an event in the search or on
            the map.
          </p>
        ) : visibleSaved.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            None of your saved events match the selected filters.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {visibleSaved.map((event) => (
              <SavedTile key={event.id} event={event} onRemove={() => saved.toggle(event.id)} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

export default function UserDashboard({
  profile,
  setupNeeded,
}: {
  profile: UserProfile;
  /** True when the database is missing the columns / table this dashboard saves to. */
  setupNeeded: boolean;
}) {
  return (
    <div className="mt-8 space-y-6">
      {setupNeeded && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
        >
          Your profile can&apos;t be loaded or saved yet: the database is missing the dashboard
          tables. Run <code className="rounded bg-muted px-1 py-0.5">supabase/user_dashboard.sql</code>{" "}
          in the Supabase SQL editor, then reload this page.
        </p>
      )}
      <ProfileSection profile={profile} />
      <InterestsSection initial={profile.interests} />
      <SavedSection initial={profile.savedEventIds} />
    </div>
  );
}
