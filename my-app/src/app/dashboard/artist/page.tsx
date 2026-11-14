import { Suspense } from "react";
import CreatorDashboard from "@/components/CreatorDashboard";

export default function ArtistDashboardPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <CreatorDashboard role="artist" title="Artist Studio" />
    </Suspense>
  );
}
