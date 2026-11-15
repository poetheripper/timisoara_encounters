// Calls to Auth0 that change or delete the login itself (email, password, the whole user).
// Server only: it uses the application's client secret.
//
// Setup, once, in the Auth0 dashboard: Applications → APIs → Auth0 Management API →
// "Machine to Machine Applications" → authorize this application with the scopes
// `update:users` and `delete:users`. See supabase/account_settings.sql for the database part.

const domain = (process.env.AUTH0_DOMAIN ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
// A separate machine-to-machine application can be used instead of the login application.
const clientId = process.env.AUTH0_MGMT_CLIENT_ID ?? process.env.AUTH0_CLIENT_ID ?? "";
const clientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET ?? process.env.AUTH0_CLIENT_SECRET ?? "";
/** The Auth0 database connection that holds email + password accounts. */
const dbConnection = process.env.AUTH0_DB_CONNECTION ?? "Username-Password-Authentication";

/** Thrown when Auth0 refuses a request. `status` is the HTTP status, `message` Auth0's explanation. */
export class Auth0ManagementError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function failure(response: Response) {
  const body = await response.json().catch(() => null);
  const message = body?.message ?? body?.error_description ?? body?.error ?? response.statusText;
  return new Auth0ManagementError(response.status, String(message));
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** An access token for the Management API, reused until shortly before it expires. */
export async function getManagementToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw await failure(response);

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(0, data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

async function managementRequest(method: "PATCH" | "DELETE", userId: string, body?: object) {
  const token = await getManagementToken();
  const response = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(userId)}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!response.ok) throw await failure(response);
}

/**
 * True for accounts that log in with an email and password kept by Auth0.
 * Accounts that log in through Google etc. have their email and password managed there.
 */
export function isPasswordAccount(userId: string) {
  return userId.startsWith("auth0|");
}

/** Removes the login from Auth0, which frees its email address for a new sign-up. */
export async function deleteAuth0User(userId: string) {
  await managementRequest("DELETE", userId);
}

/** Changes the login email. Auth0 emails the new address a verification link. */
export async function updateAuth0Email(userId: string, email: string) {
  await managementRequest("PATCH", userId, {
    email,
    email_verified: false,
    verify_email: true,
    client_id: process.env.AUTH0_CLIENT_ID,
  });
}

/** Asks Auth0 to email a link where the password can be changed. */
export async function sendPasswordChangeEmail(email: string) {
  const response = await fetch(`https://${domain}/dbconnections/change_password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.AUTH0_CLIENT_ID,
      email,
      connection: dbConnection,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw await failure(response);
}
