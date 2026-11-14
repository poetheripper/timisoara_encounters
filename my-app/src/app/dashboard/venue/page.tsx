import { Suspense } from "react";
import CreatorDashboard from "@/components/CreatorDashboard";

export default function VenueDashboardPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <CreatorDashboard role="venue" title="Venue Dashboard" />
    </Suspense>
  );
}
