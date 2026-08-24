"use client";

import {
  banUser,
  removeUser,
  setUserRole,
  unbanUser,
} from "@/app/admin/actions";
import { PageHeader } from "@/components/layout/page-header";
import { NotesManager, type NoteItem } from "@/components/notes-manager";
import { isAdminRole } from "@/lib/roles";
import {
  Button,
  Card,
  Descriptions,
  Dropdown,
  Alert,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import type { MenuProps } from "antd";
import { MoreOutlined, StopOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type AdminUserDetailProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    banned?: boolean | null;
    banReason?: string | null;
    createdAt: Date | string;
  };
  notes: NoteItem[];
  organizations: {
    id: string;
    name: string;
    slug: string;
    role: string;
    teams: { id: string; name: string }[];
  }[];
};

export function AdminUserDetail({
  user,
  notes,
  organizations,
}: AdminUserDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  function runAction(
    action: () => Promise<{ error?: string; success?: boolean }>,
    successMessage: string,
    redirectTo?: string,
  ) {
    startTransition(async () => {
      const result = await action();

      if (result.error) {
        messageApi.error(result.error);
        return;
      }

      messageApi.success(successMessage);

      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
        return;
      }

      router.refresh();
    });
  }

  const actionItems: MenuProps["items"] = [
    {
      key: "ban-toggle",
      label: user.banned ? "Unban user" : "Ban user",
      danger: !user.banned,
      onClick: () =>
        user.banned
          ? runAction(() => unbanUser(user.id), "User unbanned.")
          : runAction(
              () => banUser(user.id, "Banned by admin"),
              "User banned.",
            ),
    },
    {
      key: "delete",
      label: (
        <Popconfirm
          title="Delete this user?"
          description="This removes the user and their notes."
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={() =>
            runAction(
              () => removeUser(user.id),
              "User deleted.",
              "/admin",
            )
          }
        >
          <span style={{ color: "inherit" }}>Delete user</span>
        </Popconfirm>
      ),
      danger: true,
    },
  ];

  return (
    <>
      {contextHolder}

      <PageHeader
        title={user.name}
        description={user.email}
        breadcrumb={[
          { title: "Admin", href: "/admin" },
          { title: "Users", href: "/admin" },
          { title: user.name },
        ]}
      />

      <Card
        title="Profile"
        extra={
          <Space wrap>
            <Select
              style={{ width: 120 }}
              value={isAdminRole(user.role) ? "admin" : "user"}
              options={[
                { label: "User", value: "user" },
                { label: "Platform admin", value: "admin" },
              ]}
              onChange={(role: "user" | "admin") =>
                runAction(
                  () => setUserRole(user.id, role),
                  "Role updated.",
                )
              }
            />
            <Dropdown menu={{ items: actionItems }} trigger={["click"]}>
              <Button icon={<MoreOutlined />} loading={isPending}>
                Actions
              </Button>
            </Dropdown>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Platform role">
            <Tag color={isAdminRole(user.role) ? "gold" : "default"}>
              {isAdminRole(user.role) ? "Platform admin" : "User"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {user.banned ? (
              <Tag color="red" icon={<StopOutlined />}>
                Banned
              </Tag>
            ) : (
              <Tag color="green">Active</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Joined">
            {new Date(user.createdAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Descriptions.Item>
          {user.banned && user.banReason && (
            <Descriptions.Item label="Ban reason" span={2}>
              <Typography.Text type="danger">{user.banReason}</Typography.Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="Organization memberships" style={{ marginBottom: 24 }}>
        {organizations.length === 0 ? (
          <Typography.Text type="secondary">No memberships.</Typography.Text>
        ) : (
          <Space wrap>
            {organizations.map((organization) => (
              <Tag key={organization.id} color="blue">
                {organization.name} · {organization.role}
              </Tag>
            ))}
          </Space>
        )}
      </Card>

      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        Notes
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Notes authored by {user.name}, grouped by organization.
      </Typography.Paragraph>

      <Alert
        type="warning"
        title="Platform admin override"
        description={`Platform admins can edit every organization note authored by ${user.name}. New notes require one of the user's memberships.`}
        showIcon
        style={{ marginBottom: 16 }}
      />

      <NotesManager
        notes={notes}
        adminTarget={{
          id: user.id,
          name: user.name,
          organizations: organizations.map(({ id, name, teams }) => ({
            id,
            name,
            teams,
          })),
        }}
      />
    </>
  );
}
