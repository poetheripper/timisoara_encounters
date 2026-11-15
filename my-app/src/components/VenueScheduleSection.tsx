"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ErrorText, FIELD_CLASS, Section } from "@/components/UserDashboard";
import { ACCENT_FILL_CLASS } from "@/lib/styles";
import { saveVenueSchedule } from "@/lib/venue-details-actions";
import {
  DEFAULT_HOURS,
  EMPTY_SCHEDULE,
  WEEKDAYS,
  cleanVenueSchedule,
  type DayHours,
  type VenueSchedule,
} from "@/lib/venue-schedule";

const sameSchedule = (a: VenueSchedule, b: VenueSchedule) =>
  a.every((day, i) => day?.open === b[i]?.open && day?.close === b[i]?.close);

/** Dashboard section where a venue sets its opening hours for each day of the week. */
export default function VenueScheduleSection({ initial }: { initial: VenueSchedule | null }) {
  const [days, setDays] = useState(initial ?? EMPTY_SCHEDULE);
  const [saved, setSaved] = useState(initial ?? EMPTY_SCHEDULE);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const change = (next: VenueSchedule) => {
    setDays(next);
    setError(null);
    setJustSaved(false);
  };
  const setDay = (index: number, hours: DayHours | null) =>
    change(days.map((day, i) => (i === index ? hours : day)));

  const firstOpen = days.find(Boolean);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = cleanVenueSchedule(days);
    if (!cleaned.ok) {
      setError(cleaned.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveVenueSchedule(cleaned.schedule);
      if (result.ok) {
        setSaved(result.schedule ?? EMPTY_SCHEDULE);
        setJustSaved(true);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Section
      title="Schedule"
      hint="When your venue is open. Untick the days you are closed; a closing time before the opening time means past midnight."
    >
      <form onSubmit={onSubmit} noValidate>
        <ul className="space-y-3">
          {WEEKDAYS.map((weekday, index) => {
            const hours = days[index];
            return (
              <li key={weekday} className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex w-36 shrink-0 cursor-pointer items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={hours !== null}
                    onChange={(e) =>
                      // A newly opened day starts with the hours of the first open day.
                      setDay(index, e.target.checked ? { ...(firstOpen ?? DEFAULT_HOURS) } : null)
                    }
                    className="size-4 accent-[#4E418C] dark:accent-[#B9ADEB]"
                  />
                  {weekday}
                </label>
                {hours ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`${weekday} opening time`}
                      value={hours.open}
                      onChange={(e) => setDay(index, { ...hours, open: e.target.value })}
                      className={`${FIELD_CLASS} mt-0 h-11 w-32 rounded-full`}
                    />
                    <span aria-hidden className="text-muted-foreground">
                      –
                    </span>
                    <input
                      type="time"
                      aria-label={`${weekday} closing time`}
                      value={hours.close}
                      onChange={(e) => setDay(index, { ...hours, close: e.target.value })}
                      className={`${FIELD_CLASS} mt-0 h-11 w-32 rounded-full`}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || sameSchedule(days, saved)}
            className={`h-11 rounded-full px-5 text-sm font-medium transition disabled:opacity-50 ${ACCENT_FILL_CLASS}`}
          >
            {pending ? "Saving…" : "Save schedule"}
          </button>
          {firstOpen && (
            <button
              type="button"
              onClick={() => change(days.map(() => ({ ...firstOpen })))}
              className="h-11 rounded-full border border-border px-5 text-sm font-medium transition hover:bg-muted"
            >
              Same hours every day
            </button>
          )}
          {justSaved && !error && (
            <p role="status" className="text-sm text-muted-foreground">
              Schedule saved.
            </p>
          )}
        </div>
        {error && <ErrorText>{error}</ErrorText>}
      </form>
    </Section>
  );
}
