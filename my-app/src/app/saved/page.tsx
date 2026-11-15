import { Suspense } from "react";
import { redirect } from "next/navigation";
import SavedEvents from "@/components/SavedEvents";
import { auth0 } from "@/lib/auth0";
import { loadSearchEvents } from "@/lib/search-events-data";
import { createClient } from "@/utils/supabase/server";

async function SavedEventsContent() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=/saved");

  const supabase = createClient();
  const [{ data, error }, venueEvents] = await Promise.all([
    supabase.from("saved_events").select("event_id").eq("user_id", session.user.sub),
    loadSearchEvents(),
  ]);
  // This fails until supabase/user_dashboard.sql has been run; the page then says so.
  if (error) console.error("Saved events error:", error.message);

  return (
    <div className="mt-8 space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
        >
          Your saved events can&apos;t be loaded right now. Please try again later.
        </p>
      )}
      <SavedEvents initial={(data ?? []).map((row) => row.event_id)} venueEvents={venueEvents} />
    </div>
  );
}

export default function SavedEventsPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Saved events</h1>
      <Suspense fallback={<p className="mt-8">Loading...</p>}>
        <SavedEventsContent />
      </Suspense>
    </main>
  );
}
