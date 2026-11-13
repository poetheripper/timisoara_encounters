import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/auth-helpers";
import RoleLoginCard from "@/components/RoleLoginCard";

async function AuthSection() {
  const user = await getCurrentUserWithRole();

  if (user) {
    redirect(`/dashboard/${user.role}`);
  }

  return <RoleLoginCard />;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#efefef] flex flex-col items-center justify-center gap-4 px-6 py-12">
      <div className="bg-white rounded-[28px] shadow-[0_4px_32px_rgba(0,0,0,0.08)] px-10 py-12 flex flex-col items-center gap-4 w-[380px]">
        {/* Keep your existing <svg> logo here */}

        <Suspense fallback={<p className="text-[13px] text-gray-400">Loading...</p>}>
          <AuthSection />
        </Suspense>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <span>Powered by</span>
        <img
          src="https://cdn.auth0.com/quantum-assets/dist/latest/logos/auth0/auth0-lockup-en-onlight.svg"
          alt="Auth0"
          className="h-3 opacity-40"
        />
      </div>
    </main>
  );
}