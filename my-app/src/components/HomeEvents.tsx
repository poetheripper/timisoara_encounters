"use client";

import { useMemo } from "react";
import EventCalendar from "@/components/EventCalendar";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import { featuredEvents, homeEvents, type HomeEvent } from "@/lib/home-events";

/** The event part of the homepage: the carousel of featured events, and the calendar of all of them. */
export default function HomeEvents({ venueEvents }: { venueEvents: HomeEvent[] }) {
  const events = useMemo(() => homeEvents(venueEvents), [venueEvents]);
  const featured = useMemo(() => featuredEvents(events), [events]);

  return (
    <>
      <FeaturedCarousel slides={featured} />
      <EventCalendar events={events} />
    </>
  );
}
