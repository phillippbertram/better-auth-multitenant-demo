import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { getOrganizationShellItems } from "@/lib/organization-data";
import { headers } from "next/headers";

export default async function MainLayout({
  children,
}: LayoutProps<"/">) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const platformAdmin = isAdminRole(session?.user.role);
  const organizations = session?.user && !platformAdmin
    ? await getOrganizationShellItems(session.user.id)
    : [];

  return (
    <AppShell
      user={
        session?.user
          ? { name: session.user.name, email: session.user.email }
          : null
      }
      isAdmin={platformAdmin}
      organizations={organizations}
      activeOrganizationId={session?.session.activeOrganizationId ?? null}
      activeTeamId={session?.session.activeTeamId ?? null}
    >
      {children}
    </AppShell>
  );
}
