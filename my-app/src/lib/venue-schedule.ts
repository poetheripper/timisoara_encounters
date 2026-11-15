// A venue's weekly opening hours.
// Shared by the venue dashboard, the public profile page and the server action that saves it.

/** Opening and closing time of one day, as "HH:MM". Closing before opening means "past midnight". */
export type DayHours = { open: string; close: string };

/** Seven entries, Monday first; null is a closed day. */
export type VenueSchedule = (DayHours | null)[];

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DEFAULT_HOURS: DayHours = { open: "10:00", close: "18:00" };

export const EMPTY_SCHEDULE: VenueSchedule = WEEKDAYS.map(() => null);

const isTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Validates and cleans a schedule before saving. A week with every day closed means "no schedule". */
export function cleanVenueSchedule(
  raw: unknown,
): { ok: true; schedule: VenueSchedule | null } | { ok: false; error: string } {
  if (raw == null) return { ok: true, schedule: null };
  if (!Array.isArray(raw) || raw.length !== WEEKDAYS.length) {
    return { ok: false, error: "That schedule was not valid." };
  }

  const schedule: VenueSchedule = [];
  for (const [index, day] of raw.entries()) {
    if (day == null) {
      schedule.push(null);
      continue;
    }
    const { open, close } = day as Record<string, unknown>;
    if (!isTime(open) || !isTime(close)) {
      return { ok: false, error: `Fill in both times for ${WEEKDAYS[index]}.` };
    }
    if (open === close) {
      return { ok: false, error: `${WEEKDAYS[index]} opens and closes at the same time.` };
    }
    schedule.push({ open, close });
  }
  return { ok: true, schedule: schedule.some(Boolean) ? schedule : null };
}

/** The schedule as stored in the database, or null when there is none (or it is not valid). */
export function storedVenueSchedule(raw: unknown): VenueSchedule | null {
  const cleaned = cleanVenueSchedule(raw);
  return cleaned.ok ? cleaned.schedule : null;
}

/** Position of today in WEEKDAYS (0 = Monday), on the venues' clock rather than the server's. */
export function todayWeekdayIndex(now: Date = new Date()) {
  const name = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "Europe/Bucharest",
  }).format(now);
  return WEEKDAYS.indexOf(name as (typeof WEEKDAYS)[number]);
}
