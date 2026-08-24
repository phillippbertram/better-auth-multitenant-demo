import { PageHeader } from "@/components/layout/page-header";
import { OrganizationTabs } from "@/components/organization/organization-tabs";
import { Tag } from "antd";

export function OrganizationPageHeader({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  return (
    <>
      <PageHeader
        title={name}
        description={
          <>
            Manage the active organization. <Tag color="blue">Organization role: {role}</Tag>
          </>
        }
        breadcrumb={[
          { title: "Organizations", href: "/organizations" },
          { title: name },
        ]}
      />
      <OrganizationTabs />
    </>
  );
}
