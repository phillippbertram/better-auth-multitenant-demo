"use client";

import { authClient } from "@/lib/auth-client";
import {
  DownOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Flex,
  Layout,
  Menu,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { OrganizationShellItem } from "@/lib/organization-data";

const { Header, Sider, Content, Footer } = Layout;

type AppShellUser = {
  name: string;
  email: string;
};

type AppShellProps = {
  user: AppShellUser | null;
  isAdmin: boolean;
  children: React.ReactNode;
  organizations: OrganizationShellItem[];
  activeOrganizationId: string | null;
  activeTeamId: string | null;
};

export function AppShell({
  user,
  isAdmin,
  children,
  organizations,
  activeOrganizationId,
  activeTeamId,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [switchingContext, setSwitchingContext] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();

  const navigationItems = useMemo<MenuProps["items"]>(() => {
    if (!user) {
      return [];
    }

    if (isAdmin) {
      return [
        {
          key: "/admin",
          icon: <SettingOutlined />,
          label: <Link href="/admin">Platform admin</Link>,
        },
        {
          key: "/account",
          icon: <UserOutlined />,
          label: <Link href="/account">Account</Link>,
        },
      ];
    }

    return [
      {
        key: "/notes",
        icon: <FileTextOutlined />,
        label: <Link href="/notes">Notes</Link>,
      },
      {
        key: "/organizations",
        icon: <ApartmentOutlined />,
        label: <Link href="/organizations">Organizations</Link>,
      },
      {
        key: "/organization",
        icon: <TeamOutlined />,
        label: <Link href="/organization">Organization settings</Link>,
        disabled: !activeOrganizationId,
      },
      {
        key: "/account",
        icon: <UserOutlined />,
        label: <Link href="/account">Account</Link>,
      },
    ];
  }, [user, isAdmin, activeOrganizationId]);

  const selectedKey = useMemo(() => {
    if (pathname.startsWith("/admin")) {
      return "/admin";
    }

    if (pathname.startsWith("/notes")) {
      return "/notes";
    }

    if (pathname.startsWith("/organizations")) {
      return "/organizations";
    }

    if (pathname.startsWith("/organization")) {
      return "/organization";
    }

    if (pathname.startsWith("/account")) {
      return "/account";
    }

    return pathname;
  }, [pathname]);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        messageApi.error(result.error.message ?? "Could not sign out.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      messageApi.error("Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  async function handleOrganizationChange(organizationId: string) {
    const selectedOrganization = organizations.find(
      (item) => item.id === organizationId,
    );
    setSwitchingContext(true);

    try {
      const organizationResult = await authClient.organization.setActive({
        organizationId,
      });

      if (organizationResult.error) {
        messageApi.error(organizationResult.error.message);
        return;
      }

      const teamResult = await authClient.organization.setActiveTeam({
        teamId: selectedOrganization?.teams[0]?.id ?? null,
      });

      if (teamResult.error) {
        messageApi.error(teamResult.error.message);
        return;
      }

      messageApi.success(`${selectedOrganization?.name ?? "Organization"} is active.`);
      router.refresh();
    } finally {
      setSwitchingContext(false);
    }
  }

  async function handleTeamChange(teamId: string | null) {
    setSwitchingContext(true);
    try {
      const result = await authClient.organization.setActiveTeam({ teamId });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      router.push("/notes");
      router.refresh();
    } finally {
      setSwitchingContext(false);
    }
  }

  const activeOrganization = organizations.find(
    (item) => item.id === activeOrganizationId,
  );
  const activeTeam = activeOrganization?.teams.find(
    (item) => item.id === activeTeamId,
  );

  const organizationMenuItems: MenuProps["items"] = organizations.map(
    (item) => ({
      key: item.id,
      label: (
        <Flex align="center" gap={10} className="workspace-menu-item">
          <span className="workspace-menu-item__icon" aria-hidden="true">
            <ApartmentOutlined />
          </span>
          <span className="workspace-menu-item__copy">
            <Typography.Text strong ellipsis={{ tooltip: item.name }}>
              {item.name}
            </Typography.Text>
            <Typography.Text type="secondary">
              {item.role.split(",").join(" · ")}
            </Typography.Text>
          </span>
        </Flex>
      ),
      onClick: () => handleOrganizationChange(item.id),
    }),
  );

  const teamMenuItems: MenuProps["items"] = activeOrganization
    ? [
        {
          key: "all-organization-notes",
          icon: <FileTextOutlined />,
          label: "All organization notes",
          onClick: () => handleTeamChange(null),
        },
        { type: "divider" as const },
        ...activeOrganization.teams.map((item) => ({
          key: item.id,
          icon: <TeamOutlined />,
          label: item.name,
          onClick: () => handleTeamChange(item.id),
        })),
      ]
    : [];

  const userMenuItems: MenuProps["items"] = [
    ...(isAdmin
      ? [
          {
            key: "admin",
            icon: <SettingOutlined />,
            label: "Platform administration",
            onClick: () => router.push("/admin"),
          },
        ]
      : [
          {
            key: "notes",
            icon: <FileTextOutlined />,
            label: "Notes",
            onClick: () => router.push("/notes"),
          },
        ]),
    {
      key: "account",
      icon: <UserOutlined />,
      label: "Account settings",
      onClick: () => router.push("/account"),
    },
    { type: "divider" as const },
    {
      key: "sign-out",
      icon: <LogoutOutlined />,
      label: "Sign out",
      danger: true,
      onClick: handleSignOut,
    },
  ];

  function renderOrganizationContext() {
    if (isAdmin) {
      return null;
    }

    return (
      <div className="organization-context">
        <Typography.Text type="secondary" className="organization-context__label">
          Workspace
        </Typography.Text>
        <Dropdown
          menu={{
            items: organizationMenuItems,
            selectedKeys: activeOrganizationId ? [activeOrganizationId] : [],
          }}
          trigger={["click"]}
          disabled={organizations.length === 0 || switchingContext}
        >
          <Button
            block
            className="organization-context__switcher"
            loading={switchingContext}
            aria-label="Switch organization"
          >
            <span className="organization-context__switcher-icon" aria-hidden="true">
              <ApartmentOutlined />
            </span>
            <span className="organization-context__switcher-copy">
              <Typography.Text
                strong
                ellipsis={{ tooltip: activeOrganization?.name }}
              >
                {activeOrganization?.name ?? "Choose organization"}
              </Typography.Text>
              <Typography.Text type="secondary">Organization</Typography.Text>
            </span>
            <DownOutlined className="organization-context__chevron" />
          </Button>
        </Dropdown>
        {activeOrganization && (
          <>
            <Dropdown
              menu={{
                items: teamMenuItems,
                selectedKeys: activeTeamId
                  ? [activeTeamId]
                  : ["all-organization-notes"],
              }}
              trigger={["click"]}
              disabled={activeOrganization.teams.length === 0 || switchingContext}
            >
              <Button
                block
                className="organization-context__team-switcher"
                aria-label="Switch notes workspace"
              >
                {activeTeam ? <TeamOutlined /> : <FileTextOutlined />}
                <span className="organization-context__team-name" title={activeTeam?.name}>
                  {activeTeam?.name ?? "All organization notes"}
                </span>
                <DownOutlined className="organization-context__chevron" />
              </Button>
            </Dropdown>
            <Typography.Text type="secondary" className="organization-context__hint">
              The selected team filters notes. Access remains organization-wide.
            </Typography.Text>
            <Flex align="center" justify="space-between" gap={8} className="organization-context__role">
              <Typography.Text type="secondary">Role</Typography.Text>
              <Tag color="blue" title={activeOrganization.role}>
                {activeOrganization.role.split(",").join(" + ")}
              </Tag>
            </Flex>
          </>
        )}
      </div>
    );
  }

  const navigation = (
    <>
      {!collapsed && renderOrganizationContext()}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={navigationItems}
        onClick={() => setMobileMenuOpen(false)}
        className="app-navigation"
      />
    </>
  );

  return (
    <Layout className="app-shell">
      {contextHolder}

      <Header
        className="app-header"
        style={{
          background: token.colorBgContainer,
          borderBottomColor: token.colorBorderSecondary,
          height: "var(--app-header-height)",
          lineHeight: "normal",
          paddingInline: "var(--app-header-padding-inline)",
        }}
      >
        <Flex align="center" gap={12} className="app-header__start">
          {user && (
            <>
              <Button
                className="mobile-only"
                type="text"
                aria-label="Open navigation"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
              />
              <Button
                className="desktop-only"
                type="text"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((value) => !value)}
              />
            </>
          )}

          <Link href={user ? (isAdmin ? "/admin" : "/notes") : "/"} className="app-brand">
            <span className="app-brand__mark" aria-hidden="true">
              <SafetyCertificateOutlined />
            </span>
            <span className="app-brand__copy">
              <span className="app-brand__title">Better Auth Organizations</span>
              <small>Multi-tenant reference app</small>
            </span>
          </Link>
        </Flex>

        {user ? (
          <Dropdown menu={{ items: userMenuItems }} trigger={["click"]}>
            <Button
              type="text"
              loading={signingOut}
              className="app-user-menu"
              aria-label="Open account menu"
            >
              <Flex align="center" gap={10}>
                <Avatar icon={<UserOutlined />} />
                <Flex vertical align="start" className="app-user-menu__identity">
                  <Flex align="center" gap={6} className="app-user-menu__name-row">
                    <Typography.Text strong>{user.name}</Typography.Text>
                    {isAdmin && (
                      <Tag color="gold" className="app-user-menu__role">
                        Platform admin
                      </Tag>
                    )}
                    {!isAdmin && activeOrganization && (
                      <Tag
                        color="blue"
                        className="app-user-menu__role"
                        title={`Organization role: ${activeOrganization.role}`}
                      >
                        Org: {activeOrganization.role.split(",").join(" + ")}
                      </Tag>
                    )}
                  </Flex>
                  <Typography.Text type="secondary">{user.email}</Typography.Text>
                </Flex>
              </Flex>
            </Button>
          </Dropdown>
        ) : (
          <Flex align="center" gap={8} className="app-header__status">
            <SafetyCertificateOutlined />
            <Typography.Text type="secondary">Sign in</Typography.Text>
          </Flex>
        )}
      </Header>

      <Layout hasSider={Boolean(user)} className="app-shell__body">
        {user && (
          <>
            <Sider
              collapsible
              collapsed={collapsed}
              collapsedWidth={76}
              trigger={null}
              width={240}
              className="app-sidebar desktop-only"
              style={{
                background: token.colorBgContainer,
                borderRightColor: token.colorBorderSecondary,
              }}
            >
              {navigation}
            </Sider>

            <Drawer
              title="Navigation"
              placement="left"
              size={300}
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              className="app-mobile-drawer"
            >
              {renderOrganizationContext()}
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                items={navigationItems}
                onClick={() => setMobileMenuOpen(false)}
                className="app-navigation"
              />
            </Drawer>
          </>
        )}

        <Layout>
          <Content
            className={
              user ? "app-content app-content--authenticated" : "app-content"
            }
            style={{ background: user ? token.colorBgLayout : "transparent" }}
          >
            <div className={user ? "app-content__inner" : undefined}>
              {children}
            </div>
          </Content>

          {user && (
            <Footer
              className="app-footer"
              style={{
                background: token.colorBgContainer,
                borderTopColor: token.colorBorderSecondary,
              }}
            >
              <Typography.Text type="secondary">
                Better Auth Organizations · Next.js · PostgreSQL
              </Typography.Text>
            </Footer>
          )}
        </Layout>
      </Layout>
    </Layout>
  );
}
