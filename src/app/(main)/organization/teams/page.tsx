import { OrganizationPageHeader } from "@/components/organization/organization-page-header";
import { OrganizationTeams } from "@/components/organization/organization-teams";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace";

export default async function OrganizationTeamsPage() {
  const data = await getOrganizationWorkspaceData();

  return (
    <>
      <OrganizationPageHeader name={data.organization.name} role={data.membership.role} />
      <OrganizationTeams
        organizationId={data.organization.id}
        currentUserId={data.currentUserId}
        teams={data.teams}
        members={data.members.map(({ userId, name, email }) => ({ userId, name, email }))}
        activeTeamId={data.activeTeamId}
        canCreate={Boolean(data.permissions["team.create"])}
        canUpdate={Boolean(data.permissions["team.update"])}
        canDelete={Boolean(data.permissions["team.delete"])}
      />
    </>
  );
}
