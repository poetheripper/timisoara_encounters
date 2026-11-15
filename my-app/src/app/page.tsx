import { Suspense } from "react";
import HomeEvents from "@/components/HomeEvents";
import TextType from "@/components/TextType/TextType";
import { loadVenueEvents } from "@/lib/home-events-data";

/** Loads the events venues published; the carousel and the calendar appear once they are in. */
async function Events() {
  return <HomeEvents venueEvents={await loadVenueEvents()} />;
}

export default function HomePage() {
  return (
    <main>
      <section className="flex min-h-[18dvh] items-center justify-center px-6 py-6">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <TextType
            text={["Find your next encounter.", "Discover local artists, venues, and experiences."]}
            typingSpeed={50}
            pauseDuration={3000}
            deletingSpeed={75}
            deleteMode="backspace"
            typeEffect="none"
            mistakes={0.35}
            cursorStyle="underscore"
            cursorGlide={false}
            showCursor
            cursorColor="currentColor"
            prefixColor="currentColor"
            cursorBlinkDuration={0.5}
            cursorCharacter="_"
            prefix=""
            variableSpeed={{"min":55,"max":120}}
          />
        </h1>
      </div>
      </section>
      <Suspense
        fallback={<p className="py-30 text-center text-sm text-muted-foreground">Loading events…</p>}
      >
        <Events />
      </Suspense>
    </main>
  );
}
