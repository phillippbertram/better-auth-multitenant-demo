import { OrganizationPageHeader } from "@/components/organization/organization-page-header";
import { OrganizationRoles } from "@/components/organization/organization-roles";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace";

export default async function OrganizationRolesPage() {
  const data = await getOrganizationWorkspaceData();

  return (
    <>
      <OrganizationPageHeader name={data.organization.name} role={data.membership.role} />
      <OrganizationRoles
        roles={data.roles}
        canCreate={Boolean(data.permissions["ac.create"])}
        canRead={Boolean(data.permissions["ac.read"])}
        canUpdate={Boolean(data.permissions["ac.update"])}
        canDelete={Boolean(data.permissions["ac.delete"])}
      />
    </>
  );
}
