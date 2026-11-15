"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { LinkIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import EventBanner from "@/components/EventBanner";
import PostLink from "@/components/PostLink";
import {
  ErrorText,
  FIELD_CLASS,
  PickImageButton,
  RemoveImageButton,
  Section,
  prepareImage,
} from "@/components/UserDashboard";
import { CATEGORIES } from "@/lib/events";
import { ACCENT_FILL_CLASS } from "@/lib/styles";
import {
  POST_DESCRIPTION_MAX,
  POST_LINK_MAX,
  POST_TITLE_MAX,
  VENUE_POST_KINDS,
  bannerTag,
  byDate,
  cleanVenuePost,
  formatPostDate,
  showsBanner,
  type VenuePost,
  type VenuePostKind,
} from "@/lib/venue-posts";
import { addVenuePost, deleteVenuePost } from "@/lib/venue-posts-actions";

const EMPTY_FORM = { title: "", description: "", date: "", link: "", eventId: "", category: "" };

const NO_EVENTS: VenuePost[] = [];

/** A banner picked for the new post: the file to upload, and an address to preview it with. */
type PickedBanner = { blob: Blob; previewUrl: string };

/** One dashboard section for a venue's events or its open calls: the list, plus a form to add one. */
export default function VenuePostsSection({
  kind,
  initial,
  events = NO_EVENTS,
}: {
  kind: VenuePostKind;
  initial: VenuePost[];
  /** Open calls only: the venue's events, one of which the new open call can be connected to. */
  events?: VenuePost[];
}) {
  const labels = VENUE_POST_KINDS[kind];
  const router = useRouter();
  const eventTitle = (id: string | null) => events.find((event) => event.id === id)?.title;
  const [posts, setPosts] = useState(() => [...initial].sort(byDate));
  const [form, setForm] = useState(EMPTY_FORM);
  const [linkOpen, setLinkOpen] = useState(false);
  const [banner, setBanner] = useState<PickedBanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const replaceBanner = (next: PickedBanner | null) => {
    if (banner) URL.revokeObjectURL(banner.previewUrl);
    setBanner(next);
  };

  const onPickBanner = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        // Same size as a profile cover picture.
        const blob = await prepareImage(file, "cover");
        replaceBanner({ blob, previewUrl: URL.createObjectURL(blob) });
      } catch {
        setError("That picture can't be used. Try a JPEG or PNG image.");
      }
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = cleanVenuePost({ kind, ...form, link: linkOpen ? form.link : "" });
    if (!cleaned.ok) {
      setError(cleaned.error);
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("post", JSON.stringify(cleaned.post));
    if (banner) formData.set("banner", banner.blob, "banner.jpg");
    startTransition(async () => {
      const result = await addVenuePost(formData);
      if (result.ok) {
        setPosts((current) => [...current, result.post].sort(byDate));
        setForm(EMPTY_FORM);
        setLinkOpen(false);
        replaceBanner(null);
        // Reloads the dashboard data, so a new event can be picked in the open call form.
        if (kind === "event") router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const onDelete = (post: VenuePost) => {
    if (!window.confirm(`Delete “${post.title}”?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteVenuePost(post.id);
      if (result.ok) {
        setPosts((current) => current.filter((p) => p.id !== post.id));
        // Reloads the dashboard data: the events to pick from, and the applications that went with the post.
        router.refresh();
      } else setError(result.error);
    });
  };

  const id = (field: string) => `${kind}-${field}`;

  return (
    <Section title={labels.title} hint={labels.hint}>
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing added yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="flex items-start gap-3 rounded-2xl border border-border p-4">
              <div className="min-w-0 flex-1">
                {showsBanner(post) ? (
                  <EventBanner
                    title={post.title}
                    tag={bannerTag(post)}
                    imageUrl={post.bannerUrl}
                    seed={post.id}
                    className="h-40"
                  />
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {labels.dateLabel}: {formatPostDate(post.date)}
                    </p>
                    <h3 className="mt-1 font-semibold tracking-tight break-words">{post.title}</h3>
                  </>
                )}
                <p
                  className={`text-sm break-words whitespace-pre-line text-muted-foreground ${
                    showsBanner(post) ? "mt-3" : "mt-1"
                  }`}
                >
                  {post.description}
                </p>
                {post.category && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Category:</span>{" "}
                    <span className="font-medium">{post.category}</span>
                  </p>
                )}
                {eventTitle(post.eventId) && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">For the event:</span>{" "}
                    <span className="font-medium break-words">{eventTitle(post.eventId)}</span>
                  </p>
                )}
                {post.link && <PostLink href={post.link} label={labels.linkLabel} />}
              </div>
              <button
                type="button"
                aria-label={`Delete ${post.title}`}
                title="Delete"
                disabled={pending}
                onClick={() => onDelete(post)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <Trash2Icon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4 border-t border-border pt-5">
        <p className="text-sm font-medium">Add a new {labels.singular}</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div>
            <label htmlFor={id("title")} className="text-sm text-muted-foreground">
              Title
            </label>
            <input
              id={id("title")}
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              maxLength={POST_TITLE_MAX}
              className={`${FIELD_CLASS} h-11 rounded-full`}
            />
          </div>
          <div>
            <label htmlFor={id("date")} className="text-sm text-muted-foreground">
              {labels.dateLabel}
            </label>
            <input
              id={id("date")}
              type="date"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
              className={`${FIELD_CLASS} h-11 rounded-full`}
            />
          </div>
        </div>
        <div>
          <label htmlFor={id("description")} className="text-sm text-muted-foreground">
            Description
          </label>
          <textarea
            id={id("description")}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            maxLength={POST_DESCRIPTION_MAX}
            rows={3}
            className={`${FIELD_CLASS} resize-y rounded-2xl py-3`}
          />
        </div>
        {linkOpen && (
          <div>
            <label htmlFor={id("link")} className="text-sm text-muted-foreground">
              Link (tickets or another website)
            </label>
            <div className="flex items-center gap-2">
              <input
                id={id("link")}
                value={form.link}
                onChange={(e) => setField("link", e.target.value)}
                maxLength={POST_LINK_MAX}
                placeholder="tickets.example.com/your-event"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                className={`${FIELD_CLASS} h-11 min-w-0 rounded-full`}
              />
              <button
                type="button"
                aria-label="Remove link"
                title="Remove link"
                onClick={() => {
                  setLinkOpen(false);
                  setField("link", "");
                }}
                className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </div>
        )}
        {kind === "event" && (
          <div>
            <label htmlFor={id("category")} className="text-sm text-muted-foreground">
              Category. People find the event under it in the search and on the map.
            </label>
            <select
              id={id("category")}
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className={`${FIELD_CLASS} h-11 rounded-full`}
            >
              <option value="">Pick a category</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        )}
        {kind === "open_call" && events.length > 0 && (
          <div>
            <label htmlFor={id("event")} className="text-sm text-muted-foreground">
              Connected event (optional). Artists you accept are listed on this event.
            </label>
            <select
              id={id("event")}
              value={form.eventId}
              onChange={(e) => setField("eventId", e.target.value)}
              className={`${FIELD_CLASS} h-11 rounded-full`}
            >
              <option value="">No event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({formatPostDate(event.date)})
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">
            {labels.banner
              ? `Banner (optional). This is how the ${labels.singular} will look on your profile.`
              : `Banner (optional). Without a picture, the ${labels.singular} is shown as text only.`}
          </p>
          <EventBanner
            title={form.title.trim() || `Your ${labels.singular} title`}
            tag={form.date ? bannerTag({ kind, date: form.date }) : labels.dateLabel}
            imageUrl={banner?.previewUrl}
            seed={kind}
            className="mt-2 h-48"
          >
            <div className="absolute top-3 right-3 flex gap-2">
              {banner && (
                <RemoveImageButton
                  label="Remove banner"
                  disabled={pending}
                  onClick={() => replaceBanner(null)}
                  className="size-9"
                />
              )}
              <PickImageButton
                label={banner ? "Change banner" : "Add banner"}
                disabled={pending}
                onPick={onPickBanner}
                className="size-9"
              />
            </div>
          </EventBanner>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={`flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition disabled:opacity-50 ${ACCENT_FILL_CLASS}`}
          >
            <PlusIcon className="size-4" />
            {pending ? "Saving…" : `Add ${labels.singular}`}
          </button>
          {!linkOpen && (
            <button
              type="button"
              onClick={() => setLinkOpen(true)}
              className="flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium transition hover:bg-muted"
            >
              <LinkIcon className="size-4" />
              Add link
            </button>
          )}
        </div>
        {error && <ErrorText>{error}</ErrorText>}
      </form>
    </Section>
  );
}
