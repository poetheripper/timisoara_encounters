// The "where and when" of a venue on its public profile: a round map with the address,
// and the opening hours. Each part is its own component so it can be placed anywhere.

import { ExternalLinkIcon } from "lucide-react";
import VenueMap from "@/components/VenueMap";
import { googleMapsHref, type VenueLocation } from "@/lib/venue-location";
import { WEEKDAYS, todayWeekdayIndex, type VenueSchedule } from "@/lib/venue-schedule";

export function VenueLocationInfo({ location, name }: { location: VenueLocation; name: string }) {
  return (
    <section aria-label="Location" className="text-center">
      {location.coordinates && (
        <VenueMap
          position={location.coordinates}
          label={name}
          className="mx-auto mb-5 aspect-square w-full max-w-64 rounded-full"
        />
      )}
      <h2 className="text-lg font-semibold tracking-tight">Location</h2>
      <address className="mt-2 text-sm break-words whitespace-pre-line not-italic">
        {location.address}
      </address>
      <a
        href={googleMapsHref(location)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 hover:text-muted-foreground"
      >
        Open in Google Maps
        <ExternalLinkIcon className="size-3.5" aria-hidden />
      </a>
    </section>
  );
}

export function VenueScheduleInfo({ schedule }: { schedule: VenueSchedule }) {
  const today = todayWeekdayIndex();
  return (
    <section aria-label="Schedule">
      <h2 className="text-center text-lg font-semibold tracking-tight">Schedule</h2>
      <dl className="mt-3 space-y-1.5 text-sm">
        {WEEKDAYS.map((weekday, index) => {
          const hours = schedule[index];
          return (
            <div
              key={weekday}
              className={`flex justify-between gap-4 ${index === today ? "font-semibold" : ""}`}
            >
              <dt>
                {weekday}
                {index === today && <span className="sr-only"> (today)</span>}
              </dt>
              <dd className={hours ? "tabular-nums" : "text-muted-foreground"}>
                {hours ? `${hours.open} – ${hours.close}` : "Closed"}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
