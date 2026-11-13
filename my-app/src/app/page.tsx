import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { createClient } from "@/utils/supabase/server";

type AccountType = "user" | "artist" | "provider";
const VALID_ROLES: AccountType[] = ["user", "artist", "provider"];

async function OnboardingHandler({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const session = await auth0.getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const chosenRole: AccountType = VALID_ROLES.includes(params.role as AccountType)
    ? (params.role as AccountType)
    : "user";

  const supabase = await createClient();

  // 1. Check if this Auth0 user already exists in Supabase
  const { data: existingUser, error: selectError} = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.sub)
    .single();

  if (selectError) {
    console.error("Supabase select error:", selectError.message);
  }

  let finalRole: AccountType = chosenRole;

  if (!existingUser) {
    const { error: insertError } = await supabase.from("users").insert({
      id: session.user.sub,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
      role: chosenRole,
    });

    if (insertError) {
      console.error("Supabase insert error:", insertError.message);
    }
  } else {
    // 3. Returning user: use their saved role from the database
    finalRole = existingUser.role as AccountType;
  }

  redirect(`/dashboard/${chosenRole}`);
  return null;
}

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-8 text-center">Setting up your account...</p>}>
      <OnboardingHandler searchParams={searchParams} />
    </Suspense>
  );
}