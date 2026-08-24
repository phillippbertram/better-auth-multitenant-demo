"use client";

import { Tabs } from "antd";
import { usePathname, useRouter } from "next/navigation";

function responsiveLabel(full: string, short: string) {
  return (
    <>
      <span className="organization-tab__label--desktop">{full}</span>
      <span className="organization-tab__label--mobile">{short}</span>
    </>
  );
}

const items = [
  { key: "/organization", label: "Overview" },
  {
    key: "/organization/members",
    label: responsiveLabel("Members & invitations", "Members"),
  },
  { key: "/organization/teams", label: "Teams" },
  {
    key: "/organization/roles",
    label: responsiveLabel("Roles & permissions", "Roles"),
  },
];

export function OrganizationTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const activeKey = items.find((item) => item.key === pathname)?.key ?? "/organization";

  return (
    <Tabs
      activeKey={activeKey}
      items={items}
      onChange={(key) => router.push(key)}
      className="organization-tabs"
    />
  );
}
