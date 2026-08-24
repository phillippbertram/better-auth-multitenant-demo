import { OrganizationMembers } from "@/components/organization/organization-members";
import { OrganizationPageHeader } from "@/components/organization/organization-page-header";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace";

export default async function OrganizationMembersPage() {
  const data = await getOrganizationWorkspaceData();

  return (
    <>
      <OrganizationPageHeader name={data.organization.name} role={data.membership.role} />
      <OrganizationMembers
        organizationId={data.organization.id}
        members={data.members}
        invitations={data.invitations}
        teams={data.teams.map(({ id, name }) => ({ id, name }))}
        dynamicRoles={data.roles.map((item) => item.role)}
        canUpdateMembers={Boolean(data.permissions["member.update"])}
        canRemoveMembers={Boolean(data.permissions["member.delete"])}
        canInvite={Boolean(data.permissions["invitation.create"])}
        canCancelInvitations={Boolean(data.permissions["invitation.cancel"])}
        emailVerified={data.emailVerified}
      />
    </>
  );
}
