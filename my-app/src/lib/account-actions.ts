"use server";

import { auth0 } from "@/lib/auth0";
import {
  Auth0ManagementError,
  deleteAuth0User,
  getManagementToken,
  isPasswordAccount,
  sendPasswordChangeEmail,
  updateAuth0Email,
} from "@/lib/auth0-management";
import { PROFILE_IMAGES_BUCKET, imageFolder } from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";

export type AccountResult = { ok: true } | { ok: false; error: string };

const NOT_SIGNED_IN = { ok: false, error: "You need to be logged in." } as const;
const NOT_A_PASSWORD_ACCOUNT = {
  ok: false,
  error: "This account logs in through another service, so its email and password are managed there.",
} as const;

const EMAIL_MAX = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Logs why Auth0 refused and returns a message that is safe to show. */
function auth0Failure(action: string, error: unknown, fallback: string): AccountResult {
  if (error instanceof Auth0ManagementError) {
    console.error(`${action} Auth0 error:`, error.status, error.message);
    // 401 / 403: the application is not allowed to use the Management API yet (see auth0-management.ts).
    if (error.status === 401 || error.status === 403) {
      return {
        ok: false,
        error: "Account changes are not set up on this site yet. Please contact the administrator.",
      };
    }
    if (error.status === 429) return { ok: false, error: "Too many attempts. Please try again in a minute." };
  } else {
    console.error(`${action} error:`, error);
  }
  return { ok: false, error: fallback };
}

// Server actions can be called directly, so each one checks the session itself
// and only ever touches the account of the logged-in user.

export async function changeEmail(rawEmail: string): Promise<AccountResult> {
  const session = await auth0.getSession();
  if (!session?.user) return NOT_SIGNED_IN;
  const userId = session.user.sub;
  if (!isPasswordAccount(userId)) return NOT_A_PASSWORD_ACCOUNT;

  const email = String(rawEmail ?? "").trim().toLowerCase();
  if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (email === (session.user.email ?? "").toLowerCase()) {
    return { ok: false, error: "That is already your email address." };
  }

  try {
    await updateAuth0Email(userId, email);
  } catch (error) {
    if (
      error instanceof Auth0ManagementError &&
      (error.status === 409 || (error.status === 400 && /exist/i.test(error.message)))
    ) {
      return { ok: false, error: "That email address is already used by another account." };
    }
    return auth0Failure("changeEmail", error, "Could not change the email address. Please try again.");
  }

  // The login now uses the new address; the copies below only affect what the site displays.
  const supabase = createClient();
  const { error } = await supabase.from("users").update({ email }).eq("id", userId);
  if (error) console.error("changeEmail database error:", error.message);

  try {
    await auth0.updateSession({
      ...session,
      user: { ...session.user, email, email_verified: false },
    });
  } catch (error) {
    console.error("changeEmail session error:", error);
  }

  return { ok: true };
}

/** Emails the logged-in user a link to choose a new password. */
export async function requestPasswordChange(): Promise<AccountResult> {
  const session = await auth0.getSession();
  if (!session?.user) return NOT_SIGNED_IN;
  if (!isPasswordAccount(session.user.sub)) return NOT_A_PASSWORD_ACCOUNT;
  if (!session.user.email) return { ok: false, error: "This account has no email address." };

  try {
    await sendPasswordChangeEmail(session.user.email);
  } catch (error) {
    return auth0Failure("requestPasswordChange", error, "Could not send the email. Please try again.");
  }
  return { ok: true };
}

/** Every file in one storage folder (not its subfolders, which are listed without an id). */
async function filesIn(supabase: ReturnType<typeof createClient>, folder: string) {
  const paths: string[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(PROFILE_IMAGES_BUCKET)
      .list(folder, { limit: pageSize, offset });
    if (error) throw new Error(error.message);
    for (const entry of data) if (entry.id) paths.push(`${folder}/${entry.name}`);
    if (data.length < pageSize) return paths;
  }
}

/**
 * Permanently deletes the logged-in account: its pictures, its database rows and its Auth0 login.
 * Once this succeeds the caller must send the browser to /auth/logout to clear the session cookie.
 */
export async function deleteAccount(): Promise<AccountResult> {
  const session = await auth0.getSession();
  if (!session?.user) return NOT_SIGNED_IN;
  const userId = session.user.sub;
  const failed = "Could not delete the account. Please try again.";

  // Checked before anything is removed, so a missing Auth0 permission can't leave
  // an account that is emptied but still exists.
  try {
    await getManagementToken();
  } catch (error) {
    return auth0Failure("deleteAccount", error, failed);
  }

  const supabase = createClient();

  // Pictures: avatar and cover in the account's folder, post banners in its posts/ subfolder.
  // Leftover files are harmless, so a failure here does not stop the deletion.
  try {
    const folder = imageFolder(userId);
    const paths = [...(await filesIn(supabase, folder)), ...(await filesIn(supabase, `${folder}/posts`))];
    if (paths.length > 0) {
      const { error } = await supabase.storage.from(PROFILE_IMAGES_BUCKET).remove(paths);
      if (error) throw new Error(error.message);
    }
  } catch (error) {
    console.error("deleteAccount storage error:", error);
  }

  // Deleting the users row also removes these (on delete cascade); done explicitly
  // in case the database was created without the cascade.
  for (const [table, column] of [
    ["saved_events", "user_id"],
    ["venue_posts", "venue_id"],
  ] as const) {
    const { error } = await supabase.from(table).delete().eq(column, userId);
    if (error) console.error(`deleteAccount ${table} error:`, error.message);
  }

  const { error: deleteError } = await supabase.from("users").delete().eq("id", userId);
  if (deleteError) {
    console.error("deleteAccount users error:", deleteError.message);
    return { ok: false, error: failed };
  }
  // A delete that row level security blocks reports no error, so make sure the row is really gone.
  const { data: remaining, error: checkError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (checkError || remaining) {
    console.error(
      "deleteAccount: the users row was not deleted.",
      checkError?.message ?? "Run supabase/account_settings.sql to allow it.",
    );
    return { ok: false, error: failed };
  }

  try {
    await deleteAuth0User(userId);
  } catch (error) {
    return auth0Failure("deleteAccount", error, failed);
  }
  return { ok: true };
}
