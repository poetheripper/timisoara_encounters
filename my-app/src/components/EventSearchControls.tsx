"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { SearchIcon } from "lucide-react";
import AccountSuggestions, {
  suggestionId,
  useAccountSuggestions,
} from "@/components/AccountSuggestions";
import { profileHref } from "@/lib/accounts";
import {
  CATEGORIES,
  TIME_FILTERS,
  allEvents,
  searchEvents,
  type EventItem,
  type TimeFilterId,
} from "@/lib/events";
import { ACCENT_BORDER_CLASS, ACCENT_FILL_CLASS } from "@/lib/styles";

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * State for an event search: the search bar, the selected filters and the matching events.
 * Shared by every page that searches events (search page, map page) so they behave the same.
 *
 * @param venueEvents The events venues published, loaded by the page; searched with the test events.
 */
export function useEventSearch(venueEvents: EventItem[]) {
  const [input, setInput] = useState("");
  // The query that was last submitted with Enter; empty until then (or after clearing the bar).
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [times, setTimes] = useState<TimeFilterId[]>([]);

  const hasFilters = categories.length > 0 || times.length > 0;
  // Results exist as soon as there is a submitted query or at least one selected filter; null before that.
  // Memoized so the list keeps its identity between renders while the search is unchanged.
  const results: EventItem[] | null = useMemo(
    () =>
      query !== "" || hasFilters
        ? searchEvents({ query, categories, times }, allEvents(venueEvents))
        : null,
    [query, hasFilters, categories, times, venueEvents],
  );

  return {
    input,
    setInput,
    query,
    submit: () => setQuery(input.trim()),
    categories,
    toggleCategory: (category: string) => setCategories((list) => toggle(list, category)),
    times,
    toggleTime: (time: TimeFilterId) => setTimes((list) => toggle(list, time)),
    clearFilters: () => {
      setCategories([]);
      setTimes([]);
    },
    hasFilters,
    results,
  };
}

export type EventSearchState = ReturnType<typeof useEventSearch>;

/** One-line description of the current results, e.g. `2 results for “jazz”`. Empty before the first search. */
export function searchSummary({ results, query, hasFilters }: EventSearchState) {
  if (results === null) return "";
  const forQuery = query !== "" ? ` for “${query}”` : "";
  if (results.length === 0) {
    return `No events found${forQuery}${hasFilters ? " with the selected filters" : ""}.`;
  }
  return `${results.length} ${results.length === 1 ? "result" : "results"}${forQuery}`;
}

export function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        selected
          ? `font-medium ${ACCENT_FILL_CLASS} ${ACCENT_BORDER_CLASS}`
          : "border-border bg-muted text-foreground hover:bg-border"
      }`}
    >
      {label}
    </button>
  );
}

const NO_CATEGORIES: readonly string[] = [];

/** The category and date filter chips, with a "Clear filters" link while any is selected. */
export function EventFilterChips({
  categories,
  times,
  onToggleCategory,
  onToggleTime,
  onClear,
  hiddenCategories = NO_CATEGORIES,
}: {
  categories: string[];
  times: TimeFilterId[];
  onToggleCategory: (category: string) => void;
  onToggleTime: (time: TimeFilterId) => void;
  onClear: () => void;
  /** Categories this page does not offer as a filter chip. */
  hiddenCategories?: readonly string[];
}) {
  return (
    <div className="space-y-3">
      <div role="group" aria-label="Filter by category" className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.filter((category) => !hiddenCategories.includes(category)).map((category) => (
          <FilterChip
            key={category}
            label={category}
            selected={categories.includes(category)}
            onClick={() => onToggleCategory(category)}
          />
        ))}
      </div>
      <div role="group" aria-label="Filter by date" className="flex flex-wrap justify-center gap-2">
        {TIME_FILTERS.map((time) => (
          <FilterChip
            key={time.id}
            label={time.label}
            selected={times.includes(time.id)}
            onClick={() => onToggleTime(time.id)}
          />
        ))}
      </div>
      {(categories.length > 0 || times.length > 0) && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/** The search bar plus the category and date filter chips. */
export default function EventSearchControls({
  search,
  hiddenCategories,
  suggestAccounts = false,
}: {
  search: EventSearchState;
  /** Categories this page does not offer as a filter chip. */
  hiddenCategories?: readonly string[];
  /** Show matching artists and venues under the bar while typing (search page). */
  suggestAccounts?: boolean;
}) {
  const router = useRouter();
  const suggestions = useAccountSuggestions(search.input, suggestAccounts);
  const [focused, setFocused] = useState(false);
  // Closed with Escape or by submitting; typing again reopens the list.
  const [dismissed, setDismissed] = useState(false);
  // Row picked with the arrow keys; -1 means none.
  const [picked, setPicked] = useState(-1);

  const open =
    suggestAccounts &&
    focused &&
    !dismissed &&
    (suggestions.accounts.length > 0 || suggestions.noMatches);
  // The list can shrink while a row is picked, so an out-of-range pick counts as none.
  const highlighted = open && picked < suggestions.accounts.length ? picked : -1;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (highlighted >= 0) {
      router.push(profileHref(suggestions.accounts[highlighted].handle));
      return;
    }
    setDismissed(true);
    search.submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    const count = suggestions.accounts.length;
    if (e.key === "ArrowDown" && count > 0) {
      e.preventDefault();
      setPicked(highlighted + 1 >= count ? 0 : highlighted + 1);
    } else if (e.key === "ArrowUp" && count > 0) {
      e.preventDefault();
      setPicked(highlighted <= 0 ? count - 1 : highlighted - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDismissed(true);
    }
  };

  return (
    <div>
      <form role="search" onSubmit={onSubmit} className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={search.input}
          onChange={(e) => {
            search.setInput(e.target.value);
            setDismissed(false);
            setPicked(-1);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          placeholder="Search events, artists, venues…"
          aria-label="Search events, artists and venues"
          role={suggestAccounts ? "combobox" : undefined}
          aria-expanded={suggestAccounts ? open : undefined}
          aria-controls={suggestAccounts ? "account-suggestions" : undefined}
          aria-activedescendant={highlighted >= 0 ? suggestionId(highlighted) : undefined}
          aria-autocomplete={suggestAccounts ? "list" : undefined}
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 w-full rounded-full border border-border bg-background pr-4 pl-12 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        {open && (
          <AccountSuggestions
            accounts={suggestions.accounts}
            noMatches={suggestions.noMatches}
            highlighted={highlighted}
          />
        )}
      </form>

      <div className="mt-5">
        <EventFilterChips
          categories={search.categories}
          times={search.times}
          onToggleCategory={search.toggleCategory}
          onToggleTime={search.toggleTime}
          onClear={search.clearFilters}
          hiddenCategories={hiddenCategories}
        />
      </div>
    </div>
  );
}
