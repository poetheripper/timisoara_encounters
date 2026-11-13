// src/app/onboarding/page.tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";

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

  // TODO: Save/upsert user in PostgreSQL with `accountType: chosenRole`
  // e.g., await db.insert(users).values({ id: session.user.sub, email: session.user.email!, accountType: chosenRole }).onConflictDoNothing();

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