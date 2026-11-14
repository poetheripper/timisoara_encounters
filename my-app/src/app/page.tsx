import RoleLoginCard from "@/components/RoleLoginCard";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Timisoara Encounters
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Find your next encounter.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Discover local artists, venues, and experiences.
        </p>
        <RoleLoginCard />
      </div>
    </main>
  );
}
