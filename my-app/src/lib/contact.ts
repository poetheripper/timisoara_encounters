// Contact links shown on artist and venue profiles.
// Shared by the dashboard UI and the server action that saves them.

export type ContactLink = { type: string; value: string };

export type ContactType = {
  id: string;
  /** Name shown in the drop-down. */
  label: string;
  placeholder: string;
  inputType: "email" | "url" | "text";
  /** Returns the cleaned-up value to store, or null when the input is not valid for this type. */
  normalize: (value: string) => string | null;
};

export const CONTACT_LINKS_MAX = 10;
export const CONTACT_VALUE_MAX = 200;

/** Any web address. Adds https:// when missing and only ever lets http(s) links through. */
export function webAddress(value: string, allowedHosts?: string[]): string | null {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (!host.includes(".")) return null;
  if (allowedHosts && !allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    return null;
  }
  return url.href;
}

/** A profile on a social network: accepts the full link, or just the handle ("@name" or "name"). */
function socialProfile(hosts: string[], handlePattern: RegExp) {
  return (value: string): string | null => {
    const mentionsHost = hosts.some((host) => value.toLowerCase().includes(host));
    if (!mentionsHost && !value.includes("/")) {
      const handle = value.replace(/^@/, "");
      return handlePattern.test(handle) ? `https://${hosts[0]}/${handle}` : null;
    }
    return webAddress(value, hosts);
  };
}

// ✏️ To offer another kind of link, add one entry here. Nothing else needs to change.
export const CONTACT_TYPES: readonly ContactType[] = [
  {
    id: "email",
    label: "Email",
    placeholder: "name@example.com",
    inputType: "email",
    normalize: (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null),
  },
  {
    id: "instagram",
    label: "Instagram",
    placeholder: "@yourname or instagram.com/yourname",
    inputType: "text",
    normalize: socialProfile(["instagram.com"], /^[A-Za-z0-9._]{1,30}$/),
  },
  {
    id: "facebook",
    label: "Facebook",
    placeholder: "facebook.com/yourpage",
    inputType: "text",
    normalize: socialProfile(["facebook.com", "fb.com"], /^[A-Za-z0-9.]{3,50}$/),
  },
  {
    id: "website",
    label: "Website",
    placeholder: "yourwebsite.com",
    inputType: "text",
    normalize: (value) => webAddress(value),
  },
];

export function contactType(id: string): ContactType | undefined {
  return CONTACT_TYPES.find((type) => type.id === id);
}

export type CleanContactLinks =
  | { ok: true; links: ContactLink[] }
  /** `index` is the position of the offending link, when the problem is with one link. */
  | { ok: false; error: string; index?: number };

/** Validates and cleans a list of links. Links with an empty value are dropped. */
export function cleanContactLinks(raw: unknown): CleanContactLinks {
  if (!Array.isArray(raw)) return { ok: false, error: "That list of links was not valid." };

  const links: ContactLink[] = [];
  for (const [index, item] of raw.entries()) {
    const type = contactType(String(item?.type ?? ""));
    const value = String(item?.value ?? "").trim();
    if (value === "") continue;
    if (!type) return { ok: false, error: "That kind of link is not supported.", index };
    if (value.length > CONTACT_VALUE_MAX) {
      return { ok: false, error: `Keep the ${type.label} link under ${CONTACT_VALUE_MAX} characters.`, index };
    }
    const normalized = type.normalize(value);
    if (!normalized) return { ok: false, error: `Check the ${type.label} entry: it doesn't look valid.`, index };
    links.push({ type: type.id, value: normalized });
  }

  if (links.length > CONTACT_LINKS_MAX) {
    return { ok: false, error: `You can add at most ${CONTACT_LINKS_MAX} links.` };
  }
  return { ok: true, links };
}

/** Links as stored in the database, ignoring anything that is no longer valid. */
export function storedContactLinks(raw: unknown): ContactLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => contactType(String(item?.type ?? "")) && typeof item?.value === "string")
    .map((item) => ({ type: item.type, value: item.value }));
}
