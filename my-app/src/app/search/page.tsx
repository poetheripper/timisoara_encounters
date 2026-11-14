import EventSearch from "@/components/EventSearch";

export default function SearchPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
      <div className="mt-8">
        <EventSearch />
      </div>
    </main>
  );
}
