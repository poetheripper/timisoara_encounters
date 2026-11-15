import { Suspense } from "react";
import { requireRole } from "@/lib/auth-helpers";
import { createClient } from "@/utils/supabase/server";
import UserDashboard, { type UserProfile } from "@/components/UserDashboard";

async function UserDashboardContent() {
  const user = await requireRole(["user"]);

  const supabase = createClient();
  const profileResult = await supabase
    .from("users")
    .select("name, interests, username, bio, avatar_url, cover_url")
    .eq("id", user.sub)
    .maybeSingle();

  // This fails until supabase/user_dashboard.sql has been run; the dashboard then says so.
  if (profileResult.error) console.error("Dashboard profile error:", profileResult.error.message);

  const profile: UserProfile = {
    // The name saved in the dashboard wins over the one that came from the login.
    name: profileResult.data?.name || user.name || "",
    email: user.email ?? "",
    username: profileResult.data?.username ?? "",
    bio: profileResult.data?.bio ?? "",
    avatarUrl: profileResult.data?.avatar_url ?? null,
    coverUrl: profileResult.data?.cover_url ?? null,
    interests: profileResult.data?.interests ?? [],
  };

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">User Dashboard</h1>
      <p className="text-muted-foreground mt-1">
        Welcome, {profile.name || user.email}
      </p>
      <UserDashboard profile={profile} setupNeeded={Boolean(profileResult.error)} />
    </main>
  );
}

export default function UserDashboardPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <UserDashboardContent />
    </Suspense>
  );
}
