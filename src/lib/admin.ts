import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAdminSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/notes");
  }

  return session;
}

export async function requireAdminSessionForAction() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!isAdminRole(session.user.role)) {
    throw new Error("Forbidden");
  }

  return session;
}
