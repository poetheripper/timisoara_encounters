"use client";

import { useState, useTransition, type FormEvent } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { ErrorText, FIELD_CLASS, Section } from "@/components/UserDashboard";
import { ACCENT_FILL_CLASS } from "@/lib/styles";
import {
  POST_DESCRIPTION_MAX,
  POST_TITLE_MAX,
  VENUE_POST_KINDS,
  byDate,
  cleanVenuePost,
  formatPostDate,
  type VenuePost,
  type VenuePostKind,
} from "@/lib/venue-posts";
import { addVenuePost, deleteVenuePost } from "@/lib/venue-posts-actions";

const EMPTY_FORM = { title: "", description: "", date: "" };

/** One dashboard section for a venue's events or its open calls: the list, plus a form to add one. */
export default function VenuePostsSection({
  kind,
  initial,
}: {
  kind: VenuePostKind;
  initial: VenuePost[];
}) {
  const labels = VENUE_POST_KINDS[kind];
  const [posts, setPosts] = useState(() => [...initial].sort(byDate));
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = cleanVenuePost({ kind, ...form });
    if (!cleaned.ok) {
      setError(cleaned.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addVenuePost(cleaned.post);
      if (result.ok) {
        setPosts((current) => [...current, result.post].sort(byDate));
        setForm(EMPTY_FORM);
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
      if (result.ok) setPosts((current) => current.filter((p) => p.id !== post.id));
      else setError(result.error);
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
                <p className="text-xs text-muted-foreground">
                  {labels.dateLabel}: {formatPostDate(post.date)}
                </p>
                <h3 className="mt-1 font-semibold tracking-tight break-words">{post.title}</h3>
                <p className="mt-1 text-sm break-words whitespace-pre-line text-muted-foreground">
                  {post.description}
                </p>
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
        <button
          type="submit"
          disabled={pending}
          className={`flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition disabled:opacity-50 ${ACCENT_FILL_CLASS}`}
        >
          <PlusIcon className="size-4" />
          {pending ? "Saving…" : `Add ${labels.singular}`}
        </button>
        {error && <ErrorText>{error}</ErrorText>}
      </form>
    </Section>
  );
}
