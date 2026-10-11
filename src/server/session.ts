import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth";
import { hasPermission, isRole, type Permission, type Role } from "@/server/domain/permissions";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: Role;
};

/** Reads the session from the database (no client-trusted role data). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: unknown };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    role: isRole(u.role) ? u.role : "customer",
  };
});

/** For pages: redirects to sign-in when there is no session. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** For admin pages: sign-in redirect, then 403 if the role lacks the permission. */
export async function requirePagePermission(permission: Permission, returnTo = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!hasPermission(user.role, permission)) redirect("/access-denied");
  return user;
}

export class AuthorizationError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function assertPermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Please sign in to continue.");
  if (!hasPermission(user.role, permission)) throw new AuthorizationError();
  return user;
}

