import { OrganizationPageHeader } from "@/components/organization/organization-page-header";
import { OrganizationOverview } from "@/components/organization/organization-overview";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace";
import { splitOrganizationRoles } from "@/lib/organization-access";

export default async function OrganizationPage() {
  const data = await getOrganizationWorkspaceData();
  const currentMember = data.members.find((item) => item.userId === data.currentUserId);

  return (
    <>
      <OrganizationPageHeader name={data.organization.name} role={data.membership.role} />
      <OrganizationOverview
        organization={data.organization}
        canUpdate={Boolean(data.permissions["organization.update"])}
        canDelete={Boolean(data.permissions["organization.delete"])}
        isLastOwner={
          Boolean(currentMember?.isLastOwner) &&
          splitOrganizationRoles(data.membership.role).includes("owner")
        }
      />
    </>
  );
}
