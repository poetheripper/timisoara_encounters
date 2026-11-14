"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { ErrorText, FIELD_CLASS, Section } from "@/components/UserDashboard";
import {
  CONTACT_LINKS_MAX,
  CONTACT_TYPES,
  CONTACT_VALUE_MAX,
  cleanContactLinks,
  contactType,
  type ContactLink,
} from "@/lib/contact";
import { saveContactLinks } from "@/lib/contact-actions";
import { ACCENT_FILL_CLASS } from "@/lib/styles";

// `key` only identifies a row on screen (so React keeps focus in the right input); it is not saved.
type Row = ContactLink & { key: number };

const sameLinks = (a: ContactLink[], b: ContactLink[]) =>
  a.length === b.length && a.every((link, i) => link.type === b[i].type && link.value === b[i].value);

export default function ContactSection({ initial }: { initial: ContactLink[] }) {
  const nextKey = useRef(initial.length);
  const [rows, setRows] = useState<Row[]>(() => initial.map((link, key) => ({ ...link, key })));
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<{ message: string; index?: number } | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const edited = () => {
    setError(null);
    setJustSaved(false);
  };

  const addRow = () => {
    // Start on the first kind of link that isn't in the list yet.
    const unused = CONTACT_TYPES.find((type) => !rows.some((row) => row.type === type.id));
    const key = nextKey.current++;
    setRows((current) => [...current, { key, type: (unused ?? CONTACT_TYPES[0]).id, value: "" }]);
    edited();
  };

  const updateRow = (key: number, change: Partial<ContactLink>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
    edited();
  };

  const removeRow = (key: number) => {
    setRows((current) => current.filter((row) => row.key !== key));
    edited();
  };

  const filled = rows.filter((row) => row.value.trim() !== "");
  const unchanged = sameLinks(
    filled.map((row) => ({ type: row.type, value: row.value.trim() })),
    saved,
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = cleanContactLinks(rows);
    if (!cleaned.ok) {
      setError({ message: cleaned.error, index: cleaned.index });
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveContactLinks(cleaned.links);
      if (result.ok) {
        // Show the links as stored: full addresses, with empty rows gone.
        setRows(result.links.map((link) => ({ ...link, key: nextKey.current++ })));
        setSaved(result.links);
        setJustSaved(true);
      } else {
        setError({ message: result.error });
      }
    });
  };

  return (
    <Section
      title="Contact"
      hint="How people can reach you: an email address, social media pages or your website."
    >
      <form onSubmit={onSubmit} noValidate>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contact links yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row, index) => {
              const type = contactType(row.type) ?? CONTACT_TYPES[0];
              const invalid = error?.index === index;
              return (
                <li key={row.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    aria-label="Kind of link"
                    value={type.id}
                    onChange={(e) => updateRow(row.key, { type: e.target.value })}
                    className={`${FIELD_CLASS} mt-0 h-11 rounded-full sm:w-40 sm:shrink-0`}
                  >
                    {CONTACT_TYPES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      aria-label={`${type.label} link`}
                      aria-invalid={invalid}
                      type={type.inputType}
                      value={row.value}
                      onChange={(e) => updateRow(row.key, { value: e.target.value })}
                      maxLength={CONTACT_VALUE_MAX}
                      placeholder={type.placeholder}
                      autoCapitalize="none"
                      spellCheck={false}
                      className={`${FIELD_CLASS} mt-0 h-11 min-w-0 rounded-full ${
                        invalid ? "border-destructive" : ""
                      }`}
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${type.label} link`}
                      title="Remove"
                      onClick={() => removeRow(row.key)}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addRow}
            disabled={rows.length >= CONTACT_LINKS_MAX}
            className="flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            <PlusIcon className="size-4" />
            Add link
          </button>
          <button
            type="submit"
            disabled={pending || unchanged}
            className={`h-11 rounded-full px-5 text-sm font-medium transition disabled:opacity-50 ${ACCENT_FILL_CLASS}`}
          >
            {pending ? "Saving…" : "Save contact"}
          </button>
          {justSaved && !error && (
            <p role="status" className="text-sm text-muted-foreground">
              Contact saved.
            </p>
          )}
        </div>
        {error && <ErrorText>{error.message}</ErrorText>}
      </form>
    </Section>
  );
}
