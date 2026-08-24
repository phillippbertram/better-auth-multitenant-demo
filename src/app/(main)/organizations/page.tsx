import { OrganizationsContent } from "@/components/organization/organizations-content";
import { auth } from "@/lib/auth";
import { getOrganizationShellItems } from "@/lib/organization-data";
import { getPendingInvitationsForUser } from "@/lib/organization-workspace";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/roles";

export default async function OrganizationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");
  if (isAdminRole(session.user.role)) redirect("/admin");

  const [organizations, invitations] = await Promise.all([
    getOrganizationShellItems(session.user.id),
    getPendingInvitationsForUser(session.user.email),
  ]);

  return (
    <OrganizationsContent
      organizations={organizations}
      invitations={invitations}
      activeOrganizationId={session.session.activeOrganizationId ?? null}
      emailVerified={session.user.emailVerified}
    />
  );
}
