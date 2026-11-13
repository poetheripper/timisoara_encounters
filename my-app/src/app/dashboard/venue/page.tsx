import { Suspense } from "react";
import { requireRole } from "@/lib/auth-helpers";
import LogoutButton from "@/components/LogoutButton";

async function ProviderDashboardContent() {
  const provider = await requireRole(["venue"]);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provider Hub</h1>
          <p className="text-gray-500 mt-1">Welcome, {provider.name || provider.email}</p>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}

export default function ProviderDashboardPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <ProviderDashboardContent />
    </Suspense>
  );
}