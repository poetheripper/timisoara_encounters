"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { CameraIcon, Trash2Icon } from "lucide-react";
import {
  removeProfileImage,
  saveInterests,
  saveProfile,
  uploadProfileImage,
  type ProfileText,
} from "@/app/dashboard/user/actions";
import { EventFilterChips, FilterChip } from "@/components/EventSearchControls";
import SaveEventButton, { useSavedEvents } from "@/components/SaveEventButton";
import { EVENTS, eventBackground, searchEvents, type EventItem, type TimeFilterId } from "@/lib/events";
import {
  BIO_MAX,
  IMAGE_MAX_BYTES,
  INTERESTS,
  NAME_MAX,
  USERNAME_MAX,
  nameProblem,
  usernameProblem,
  type ImageKind,
} from "@/lib/profile";
import { ACCENT_FILL_CLASS } from "@/lib/styles";

export type UserProfile = {
  name: string;
  email: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  interests: string[];
  savedEventIds: string[];
};

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-sm text-destructive">
      {children}
    </p>
  );
}

function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] ?? email).slice(0, 2).toUpperCase() || "?";
}

// Largest size each picture is stored at. The avatar is cropped to a centered square.
const IMAGE_SIZE: Record<ImageKind, { width: number; height: number; crop: boolean }> = {
  avatar: { width: 512, height: 512, crop: true },
  cover: { width: 1600, height: 900, crop: false },
};

/** Shrinks a picked image in the browser to a JPEG small enough to upload. */
async function prepareImage(file: File, kind: ImageKind): Promise<Blob> {
  const { width: maxW, height: maxH, crop } = IMAGE_SIZE[kind];
  const bitmap = await createImageBitmap(file);

  // Source rectangle: the whole image, or its centered square for the avatar.
  const side = Math.min(bitmap.width, bitmap.height);
  const sw = crop ? side : bitmap.width;
  const sh = crop ? side : bitmap.height;
  const sx = (bitmap.width - sw) / 2;
  const sy = (bitmap.height - sh) / 2;

  const scale = Math.min(1, maxW / sw, maxH / sh);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  // JPEG has no transparency; without this, transparent areas would turn black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Lower the quality step by step until the file fits the upload limit.
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= IMAGE_MAX_BYTES) return blob;
  }
  throw new Error("Image is too large");
}

/** State and actions for one profile picture (avatar or cover). */
function useProfileImage(kind: ImageKind, initialUrl: string | null) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const upload = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      let blob: Blob;
      try {
        blob = await prepareImage(file, kind);
      } catch {
        setError("That picture can't be used. Try a JPEG or PNG image.");
        return;
      }
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("file", blob, `${kind}.jpg`);
      const result = await uploadProfileImage(formData);
      if (result.ok) setUrl(result.url);
      else setError(result.error);
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeProfileImage(kind);
      if (result.ok) setUrl(null);
      else setError(result.error);
    });
  };

  return { url, error, pending, upload, remove };
}

// These buttons sit on top of a picture, so they keep the same look in both themes.
const ON_IMAGE_BUTTON_CLASS =
  "flex cursor-pointer items-center justify-center rounded-full bg-white/85 text-black shadow backdrop-blur transition hover:bg-white focus-within:ring-2 focus-within:ring-ring";

/** Camera button that opens the file picker. The <label> makes the hidden input clickable. */
function PickImageButton({
  label,
  disabled,
  onPick,
  className = "",
}: {
  label: string;
  disabled: boolean;
  onPick: (file: File | undefined) => void;
  className?: string;
}) {
  return (
    <label
      title={label}
      className={`${ON_IMAGE_BUTTON_CLASS} ${disabled ? "pointer-events-none opacity-60" : ""} ${className}`}
    >
      <CameraIcon className="size-4" aria-hidden />
      <span className="sr-only">{label}</span>
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          // Lets the same file be picked again after a failed upload.
          e.target.value = "";
        }}
      />
    </label>
  );
}

function RemoveImageButton({
  label,
  disabled,
  onClick,
  className = "",
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`${ON_IMAGE_BUTTON_CLASS} disabled:pointer-events-none disabled:opacity-60 ${className}`}
    >
      <Trash2Icon className="size-4" />
    </button>
  );
}

export const FIELD_CLASS =
  "mt-1 w-full border border-border bg-background px-4 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

/** What the profile editor needs. Shared with the artist and venue dashboards. */
export type EditableProfile = Pick<
  UserProfile,
  "name" | "email" | "username" | "bio" | "avatarUrl" | "coverUrl"
>;

export function ProfileSection({ profile }: { profile: EditableProfile }) {
  const avatar = useProfileImage("avatar", profile.avatarUrl);
  const cover = useProfileImage("cover", profile.coverUrl);

  const [form, setForm] = useState<ProfileText>({
    name: profile.name,
    username: profile.username,
    bio: profile.bio,
  });
  const [saved, setSaved] = useState(form);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const trimmed: ProfileText = {
    name: form.name.trim(),
    username: form.username.trim(),
    bio: form.bio.trim(),
  };
  const unchanged =
    trimmed.name === saved.name && trimmed.username === saved.username && trimmed.bio === saved.bio;

  const setField = (field: keyof ProfileText, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
    setJustSaved(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const problem =
      nameProblem(trimmed.name) ??
      (trimmed.username === "" ? null : usernameProblem(trimmed.username));
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveProfile(trimmed);
      if (result.ok) {
        setSaved(trimmed);
        setJustSaved(true);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Section title="Profile">
      {/* Cover picture, with the profile picture overlapping its bottom edge. */}
      <div className="relative mb-14">
        <div className="relative h-36 overflow-hidden rounded-2xl bg-muted sm:h-48">
          {cover.url && (
            // eslint-disable-next-line @next/next/no-img-element -- user upload, already resized
            <img src={cover.url} alt="Cover picture" className="size-full object-cover" />
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            {cover.url && (
              <RemoveImageButton
                label="Remove cover picture"
                disabled={cover.pending}
                onClick={cover.remove}
                className="size-9"
              />
            )}
            <PickImageButton
              label={cover.url ? "Change cover picture" : "Add cover picture"}
              disabled={cover.pending}
              onPick={cover.upload}
              className="size-9"
            />
          </div>
        </div>

        <div className="absolute -bottom-12 left-5">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-muted text-2xl font-semibold text-muted-foreground">
            {avatar.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- user upload, already resized
              <img src={avatar.url} alt="Profile picture" className="size-full object-cover" />
            ) : (
              <span aria-hidden>{initials(saved.name, profile.email)}</span>
            )}
          </div>
          <PickImageButton
            label={avatar.url ? "Change profile picture" : "Add profile picture"}
            disabled={avatar.pending}
            onPick={avatar.upload}
            className="absolute right-0 bottom-0 size-8"
          />
          {avatar.url && (
            <RemoveImageButton
              label="Remove profile picture"
              disabled={avatar.pending}
              onClick={avatar.remove}
              className="absolute bottom-0 left-0 size-8"
            />
          )}
        </div>
      </div>

      {(cover.pending || avatar.pending) && (
        <p role="status" className="text-sm text-muted-foreground">
          Updating picture…
        </p>
      )}
      {cover.error && <ErrorText>{cover.error}</ErrorText>}
      {avatar.error && <ErrorText>{avatar.error}</ErrorText>}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="text-sm text-muted-foreground">
              Name
            </label>
            <input
              id="profile-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              maxLength={NAME_MAX}
              autoComplete="name"
              placeholder="Your name"
              className={`${FIELD_CLASS} h-11 rounded-full`}
            />
          </div>
          <div>
            <label htmlFor="profile-username" className="text-sm text-muted-foreground">
              Username
            </label>
            <input
              id="profile-username"
              value={form.username}
              onChange={(e) => setField("username", e.target.value)}
              maxLength={USERNAME_MAX}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Choose a unique username"
              className={`${FIELD_CLASS} h-11 rounded-full`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-bio" className="text-sm text-muted-foreground">
            Description
          </label>
          <textarea
            id="profile-bio"
            value={form.bio}
            onChange={(e) => setField("bio", e.target.value)}
            maxLength={BIO_MAX}
            rows={3}
            placeholder="Tell others a little about yourself"
            className={`${FIELD_CLASS} resize-y rounded-2xl py-3`}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {form.bio.length}/{BIO_MAX}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || unchanged}
            className={`h-11 rounded-full px-5 text-sm font-medium transition disabled:opacity-50 ${ACCENT_FILL_CLASS}`}
          >
            {pending ? "Saving…" : "Save profile"}
          </button>
          {justSaved && !error && (
            <p role="status" className="text-sm text-muted-foreground">
              Profile saved.
            </p>
          )}
        </div>
        {error && <ErrorText>{error}</ErrorText>}
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
