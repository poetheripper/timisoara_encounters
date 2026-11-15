import { Suspense } from "react";
import { redirect } from "next/navigation";
import AccountSettings from "@/components/AccountSettings";
import { auth0 } from "@/lib/auth0";
import { isPasswordAccount } from "@/lib/auth0-management";

async function AccountSettingsContent() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=/account/settings");

  return (
    <AccountSettings
      email={session.user.email ?? ""}
      canChangeLogin={isPasswordAccount(session.user.sub)}
    />
  );
}

export default function AccountSettingsPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Account settings</h1>
      <Suspense fallback={<p className="mt-8">Loading...</p>}>
        <AccountSettingsContent />
      </Suspense>
    </main>
  );
}
