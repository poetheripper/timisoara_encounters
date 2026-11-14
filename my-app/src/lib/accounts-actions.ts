"use server";

import {
  PUBLIC_DB_ROLES,
  displayName,
  publicRole,
  type AccountSummary,
} from "@/lib/accounts";
import { createClient } from "@/utils/supabase/server";

const SUGGESTIONS_MAX = 6;

/** Artists and venues whose name or username contains the query. Used for search-as-you-type. */
export async function searchAccounts(rawQuery: string): Promise<AccountSummary[]> {
  // Characters with a meaning in the filter below are dropped, so the query is only ever text.
  const query = String(rawQuery ?? "")
    .slice(0, 50)
    .replace(/[,()"\\%*]/g, " ")
    .trim();
  if (query === "") return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, username, role, avatar_url")
    .in("role", PUBLIC_DB_ROLES)
    .or(`name.ilike."%${query}%",username.ilike."%${query}%"`)
    .order("name")
    .limit(SUGGESTIONS_MAX);
  if (error) {
    console.error("searchAccounts error:", error.message);
    return [];
  }

  return data.flatMap((row) => {
    const role = publicRole(row.role);
    if (!role) return [];
    return [
      {
        handle: row.username || row.id,
        name: displayName(row.name, row.username),
        username: row.username ?? null,
        role,
        avatarUrl: row.avatar_url ?? null,
      },
    ];
  });
}
