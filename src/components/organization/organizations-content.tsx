"use client";

import { authClient } from "@/lib/auth-client";
import type { OrganizationShellItem } from "@/lib/organization-data";
import {
  ApartmentOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";

type InvitationItem = {
  id: string;
  role: string | null;
  teamId: string | null;
  expiresAt: Date | string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  inviterName: string;
};

type OrganizationFormValues = {
  name: string;
  slug: string;
  logo?: string;
  metadata?: string;
};

export function OrganizationsContent({
  organizations,
  invitations,
  activeOrganizationId,
  emailVerified,
}: {
  organizations: OrganizationShellItem[];
  invitations: InvitationItem[];
  activeOrganizationId: string | null;
  emailVerified: boolean;
}) {
  const router = useRouter();
  const [form] = Form.useForm<OrganizationFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  function createOrganization(values: OrganizationFormValues) {
    setError(null);
    startTransition(async () => {
      let metadata: Record<string, unknown> = {};
      try {
        metadata = values.metadata?.trim() ? JSON.parse(values.metadata) : {};
      } catch {
        setError("Metadata must be a valid JSON object.");
        return;
      }

      const slug = values.slug.trim().toLowerCase();
      const slugResult = await authClient.organization.checkSlug({ slug });
      if (slugResult.error) {
        setError(slugResult.error.message ?? "This slug is already in use.");
        return;
      }

      const result = await authClient.organization.create({
        name: values.name.trim(),
        slug,
        logo: values.logo?.trim() || null,
        metadata,
      });
      if (result.error) {
        setError(result.error.message ?? "Could not create the organization.");
        return;
      }

      messageApi.success("Organization created with a default team.");
      setModalOpen(false);
      form.resetFields();
      router.push("/organization");
      router.refresh();
    });
  }

  function activateOrganization(item: OrganizationShellItem) {
    startTransition(async () => {
      const orgResult = await authClient.organization.setActive({ organizationId: item.id });
      if (orgResult.error) {
        messageApi.error(orgResult.error.message);
        return;
      }
      await authClient.organization.setActiveTeam({ teamId: item.teams[0]?.id ?? null });
      router.push("/notes");
      router.refresh();
    });
  }

  function respondToInvitation(invitation: InvitationItem, accept: boolean) {
    startTransition(async () => {
      const result = accept
        ? await authClient.organization.acceptInvitation({ invitationId: invitation.id })
        : await authClient.organization.rejectInvitation({ invitationId: invitation.id });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      if (accept) {
        await authClient.organization.setActive({ organizationId: invitation.organizationId });
        await authClient.organization.setActiveTeam({ teamId: invitation.teamId ?? null });
        messageApi.success(`Joined ${invitation.organizationName}.`);
        router.push("/notes");
      } else {
        messageApi.success("Invitation declined.");
      }
      router.refresh();
    });
  }

  return (
    <>
      {contextHolder}
      <PageHeader
        title="Organizations"
        description="Choose the tenant you want to work in, create a new organization, or respond to invitations."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New organization</Button>}
      />

      {!emailVerified && invitations.length > 0 && (
        <Alert type="warning" title="Verify your email first" description="Better Auth requires a verified email address before invitations can be accepted or rejected." showIcon style={{ marginBottom: 20 }} />
      )}

      <Typography.Title level={4}>Your organizations</Typography.Title>
      {organizations.length === 0 ? (
        <Card className="surface-card" style={{ marginBottom: 28 }}>
          <Empty description="You are not a member of an organization yet." />
        </Card>
      ) : (
        <div className="organization-grid" style={{ marginBottom: 32 }}>
          {organizations.map((item) => (
            <Card
              key={item.id}
              className="surface-card"
              actions={[
                <Button key="open" type={item.id === activeOrganizationId ? "primary" : "link"} onClick={() => activateOrganization(item)} loading={isPending}>
                  {item.id === activeOrganizationId ? "Open active workspace" : "Set active and open"}
                </Button>,
              ]}
            >
              <Flex gap={14} align="start">
                <Avatar size={48} icon={<ApartmentOutlined />} />
                <div>
                  <Typography.Title level={4} style={{ margin: 0 }}>{item.name}</Typography.Title>
                  <Typography.Text type="secondary">/{item.slug}</Typography.Text>
                  <Flex gap={6} wrap style={{ marginTop: 12 }}>
                    <Tag color="blue">{item.role}</Tag>
                    <Tag>{item.teams.length} {item.teams.length === 1 ? "team" : "teams"}</Tag>
                    {item.id === activeOrganizationId && <Tag color="green">Active</Tag>}
                  </Flex>
                </div>
              </Flex>
            </Card>
          ))}
        </div>
      )}

      <Typography.Title level={4}>Pending invitations</Typography.Title>
      <Card className="surface-card">
        {invitations.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No pending invitations." />
        ) : (
          <Flex vertical gap={12}>
            {invitations.map((item) => (
              <Flex key={item.id} justify="space-between" align="center" gap={16} wrap className="note-item">
                <div>
                  <Typography.Text strong>{item.organizationName}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">
                    Invited by {item.inviterName} · Roles: {item.role || "member"} · Expires {new Date(item.expiresAt).toLocaleString("en-US")}
                  </Typography.Text>
                </div>
                <Space>
                  <Button icon={<CheckOutlined />} type="primary" onClick={() => respondToInvitation(item, true)} disabled={!emailVerified} loading={isPending}>Accept</Button>
                  <Button icon={<CloseOutlined />} onClick={() => respondToInvitation(item, false)} disabled={!emailVerified} loading={isPending}>Decline</Button>
                </Space>
              </Flex>
            ))}
          </Flex>
        )}
      </Card>

      <Modal title="Create organization" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} destroyOnHidden>
        <Form<OrganizationFormValues> form={form} layout="vertical" requiredMark={false} onFinish={createOrganization}>
          <Form.Item label="Name" name="name" rules={[{ required: true }, { max: 120 }]}>
            <Input onChange={(event) => {
              if (!form.isFieldTouched("slug")) {
                form.setFieldValue("slug", event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
              }
            }} />
          </Form.Item>
          <Form.Item label="Slug" name="slug" rules={[{ required: true }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: "Use lowercase letters, numbers, and hyphens." }]}>
            <Input prefix="/" />
          </Form.Item>
          <Form.Item label="Logo URL" name="logo" rules={[{ type: "url", warningOnly: true }]}>
            <Input placeholder="https://example.com/logo.svg" />
          </Form.Item>
          <Form.Item label="Metadata (JSON)" name="metadata">
            <Input.TextArea rows={5} placeholder={'{"industry":"Design"}'} spellCheck={false} />
          </Form.Item>
          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={isPending} block>Create organization</Button>
        </Form>
      </Modal>
    </>
  );
}
