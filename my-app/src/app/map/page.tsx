import { Suspense } from "react";
import EventMap from "@/components/EventMap";
import { loadSearchEvents } from "@/lib/search-events-data";

/** Loads the events venues published; they are shown together with the test events. */
async function Map() {
  return <EventMap venueEvents={await loadSearchEvents()} />;
}

export default function MapPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Map</h1>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted-foreground">Loading events…</p>}>
          <Map />
        </Suspense>
      </div>
    </main>
  );
}
