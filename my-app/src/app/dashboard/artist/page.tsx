import { Suspense } from "react";
import { requireRole } from "@/lib/auth-helpers";
import LogoutButton from "@/components/LogoutButton";

async function ArtistDashboardContent() {
  const artist = await requireRole(["artist"]);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Artist Studio</h1>
          <p className="text-muted-foreground mt-1">Welcome, {artist.name || artist.email}</p>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}

export default function ArtistDashboardPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <ArtistDashboardContent />
    </Suspense>
  );
}