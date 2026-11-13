// src/lib/auth-helpers.ts
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";

export type AccountType = "user" | "artist" | "provider";

export async function getCurrentUserWithRole() {
  const session = await auth0.getSession();
  if (!session?.user) return null;

  const role =
    (session.user["https://myapp.com/role"] as AccountType) || "user";

  return {
    ...session.user,
    role,
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