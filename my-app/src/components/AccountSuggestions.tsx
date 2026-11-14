"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROLE_LABEL, profileHref, type AccountSummary } from "@/lib/accounts";
import { searchAccounts } from "@/lib/accounts-actions";

const TYPING_PAUSE_MS = 200;

/** Artists and venues matching the text typed so far. Looks them up shortly after typing pauses. */
export function useAccountSuggestions(input: string, enabled: boolean) {
  const query = enabled ? input.trim() : "";
  const [found, setFound] = useState<{ query: string; accounts: AccountSummary[] } | null>(null);

  useEffect(() => {
    if (query === "") return;
    // A newer keystroke cancels this lookup, so an older, slower answer never replaces a newer one.
    let cancelled = false;
    const id = setTimeout(async () => {
      const accounts = await searchAccounts(query).catch(() => []);
      if (!cancelled) setFound({ query, accounts });
    }, TYPING_PAUSE_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  return {
    // The previous matches stay up while the next lookup is on its way, so the list doesn't flicker.
    accounts: query === "" ? [] : (found?.accounts ?? []),
    /** True once the lookup for exactly this text has come back with nothing. */
    noMatches: query !== "" && found?.query === query && found.accounts.length === 0,
  };
}

export const suggestionId = (index: number) => `account-suggestion-${index}`;

/** The drop-down under the search bar. `highlighted` is the row picked with the arrow keys. */
export default function AccountSuggestions({
  accounts,
  noMatches,
  highlighted,
}: {
  accounts: AccountSummary[];
  noMatches: boolean;
  highlighted: number;
}) {
  if (accounts.length === 0 && !noMatches) return null;

  return (
    <div
      // Keeps the cursor in the search bar while a suggestion is being clicked.
      onMouseDown={(e) => e.preventDefault()}
      className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-3xl border border-border bg-popover p-2 text-left text-popover-foreground shadow-lg"
    >
      {accounts.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">No artists or venues match.</p>
      ) : (
        <ul id="account-suggestions" role="listbox" aria-label="Artists and venues">
          {accounts.map((account, index) => (
            <li
              key={account.handle}
              id={suggestionId(index)}
              role="option"
              aria-selected={index === highlighted}
            >
              <Link
                href={profileHref(account.handle)}
                tabIndex={-1}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-muted ${
                  index === highlighted ? "bg-muted" : ""
                }`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {account.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- user upload, already resized
                    <img src={account.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <span aria-hidden>{account.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{account.name}</span>
                  {account.username && (
                    <span className="block truncate text-sm text-muted-foreground">
                      @{account.username}
                    </span>
                  )}
                </span>
                <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  {ROLE_LABEL[account.role]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
