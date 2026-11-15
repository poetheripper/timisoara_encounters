import { Suspense } from "react";
import { connection } from "next/server";
import OpenCallSearch from "@/components/OpenCallSearch";
import { currentAccount, loadAppliedCallIds, loadOpenCalls } from "@/lib/open-calls-data";
import { todayDay } from "@/lib/venue-posts";

async function OpenCallsContent() {
  // "Today" changes between requests, so this must not be worked out when the site is built.
  await connection();
  const [account, openCalls] = await Promise.all([currentAccount(), loadOpenCalls()]);
  // Only artists apply, so only they have applications to look up.
  const applied = account?.role === "artist" ? await loadAppliedCallIds(account.id) : null;

  return (
    <OpenCallSearch
      calls={openCalls.calls}
      viewer={account ? { role: account.role } : null}
      appliedIds={applied?.ids ?? []}
      today={todayDay()}
      setupNeeded={openCalls.error || Boolean(applied?.error)}
    />
  );
}

export default function OpenCallsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Open calls</h1>
      <p className="mt-2 text-muted-foreground">
        Invitations from venues for artists to apply. Anyone can browse; artists can apply.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted-foreground">Loading open calls…</p>}>
          <OpenCallsContent />
        </Suspense>
      </div>
    </main>
  );
}
