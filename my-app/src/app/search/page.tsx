import { Suspense } from "react";
import EventSearch from "@/components/EventSearch";
import { loadSearchEvents } from "@/lib/search-events-data";

/** Loads the events venues published; they are searched together with the test events. */
async function Search() {
  return <EventSearch venueEvents={await loadSearchEvents()} />;
}

export default function SearchPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted-foreground">Loading events…</p>}>
          <Search />
        </Suspense>
      </div>
    </main>
  );
}
