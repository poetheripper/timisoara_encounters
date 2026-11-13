// src/lib/auth-helpers.ts
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { createClient } from "@/utils/supabase/server";

export type AccountType = "user" | "artist" | "provider";

export async function getCurrentUserWithRole() {
  const session = await auth0.getSession();
  if (!session?.user) return null;

  const supabase = await createClient();
  const { data: dbUser, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.sub)
    .maybeSingle();

  if (error) {
    console.error("Supabase auth-helper error:", error.message);
  }

  // If the user logged in without hitting /onboarding, insert them as 'user'
  if (!dbUser) {
    const { error: insertError } = await supabase.from("users").insert({
      id: session.user.sub,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
      role: "user",
    });
    if (insertError) {
      console.error("Fallback insert error:", insertError.message);
    }
    return { ...session.user, role: "user" as AccountType };
  }

  return {
    ...session.user,
    role: (dbUser.role as AccountType) || "user",
  };
}

export async function requireRole(allowedRoles: AccountType[]) {
  const user = await getCurrentUserWithRole();

  if (!user) {
    redirect("/auth/login");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect(`/dashboard/${user.role}`);
  }

  return user;
}