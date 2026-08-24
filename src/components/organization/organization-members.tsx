"use client";

import { authClient } from "@/lib/auth-client";
import { DeleteOutlined, MailOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
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
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type MemberItem = {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string;
  image: string | null;
  isLastOwner: boolean;
};

type InvitationItem = {
  id: string;
  email: string;
  role: string | null;
  roles: string[];
  teamId: string | null;
  status: string;
  expiresAt: Date | string;
};

type InviteValues = { email: string; roles: string[]; teamId?: string };

export function OrganizationMembers({
  organizationId,
  members,
  invitations,
  teams,
  dynamicRoles,
  canUpdateMembers,
  canRemoveMembers,
  canInvite,
  canCancelInvitations,
  emailVerified,
}: {
  organizationId: string;
  members: MemberItem[];
  invitations: InvitationItem[];
  teams: { id: string; name: string }[];
  dynamicRoles: string[];
  canUpdateMembers: boolean;
  canRemoveMembers: boolean;
  canInvite: boolean;
  canCancelInvitations: boolean;
  emailVerified: boolean;
}) {
  const router = useRouter();
  const [form] = Form.useForm<InviteValues>();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const roleOptions = ["owner", "admin", "member", ...dynamicRoles].map((role) => ({
    label: role === "admin" ? "Organization admin" : role,
    value: role,
  }));
  const pendingInvitations = invitations.filter(
    (item) => item.status === "pending",
  );

  function invite(values: InviteValues) {
    setError(null);
    startTransition(async () => {
      const result = await authClient.organization.inviteMember({
        email: values.email.trim().toLowerCase(),
        role: values.roles,
        teamId: values.teamId,
        organizationId,
      });
      if (result.error) {
        setError(result.error.message ?? "Could not send the invitation.");
        return;
      }
      messageApi.success("Invitation created. In development, the link is printed in the terminal.");
      setInviteOpen(false);
      form.resetFields();
      router.refresh();
    });
  }

  function updateRoles(item: MemberItem, roles: string[]) {
    if (roles.length === 0) return;
    startTransition(async () => {
      const result = await authClient.organization.updateMemberRole({
        memberId: item.id,
        role: roles,
        organizationId,
      });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      messageApi.success("Organization roles updated.");
      router.refresh();
    });
  }

  function removeMember(item: MemberItem) {
    startTransition(async () => {
      const result = await authClient.organization.removeMember({
        memberIdOrEmail: item.id,
        organizationId,
      });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      messageApi.success("Member removed.");
      router.refresh();
    });
  }

  function resendInvitation(item: InvitationItem) {
    startTransition(async () => {
      const result = await authClient.organization.inviteMember({
        email: item.email,
        role: item.roles,
        teamId: item.teamId ?? undefined,
        organizationId,
        resend: true,
      });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      messageApi.success("Invitation sent again.");
      router.refresh();
    });
  }

  function cancelInvitation(id: string) {
    startTransition(async () => {
      const result = await authClient.organization.cancelInvitation({ invitationId: id });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      messageApi.success("Invitation canceled.");
      router.refresh();
    });
  }

  return (
    <Flex vertical gap={24}>
      {contextHolder}
      <Card
        title={`Members (${members.length})`}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)} disabled={!canInvite || !emailVerified}>Invite member</Button>}
        className="surface-card"
      >
        {!emailVerified && canInvite && (
          <Alert type="warning" title="Verify your email before sending invitations." showIcon style={{ marginBottom: 16 }} />
        )}
        <Flex vertical gap={12}>
          {members.map((item) => (
            <div key={item.id} className="organization-member-row">
              <Flex gap={12} align="center" className="organization-member-row__identity">
                <Avatar src={item.image}>{item.name.slice(0, 1)}</Avatar>
                <div className="organization-member-row__copy">
                  <Typography.Text strong ellipsis={{ tooltip: item.name }}>
                    {item.name}
                  </Typography.Text>
                  <Flex align="center" gap={8} wrap className="organization-member-row__meta">
                    <Typography.Text type="secondary" ellipsis={{ tooltip: item.email }}>
                      {item.email}
                    </Typography.Text>
                    {item.isLastOwner && <Tag color="gold">Last owner</Tag>}
                  </Flex>
                </div>
              </Flex>
              <Flex gap={8} align="center" className="organization-member-row__controls">
                <Select
                  mode="multiple"
                  className="organization-member-row__roles"
                  value={item.role.split(",").map((role) => role.trim()).filter(Boolean)}
                  options={roleOptions}
                  disabled={!canUpdateMembers || item.isLastOwner || isPending}
                  onChange={(roles) => updateRoles(item, roles)}
                  maxTagCount="responsive"
                />
                <Popconfirm title="Remove this member?" description={item.isLastOwner ? "The last owner cannot be removed." : "Their organization access will end."} onConfirm={() => removeMember(item)} disabled={!canRemoveMembers || item.isLastOwner}>
                  <Button danger type="text" icon={<DeleteOutlined />} aria-label={`Remove ${item.name}`} disabled={!canRemoveMembers || item.isLastOwner} loading={isPending} />
                </Popconfirm>
              </Flex>
            </div>
          ))}
        </Flex>
      </Card>

      <Card title={`Open invitations (${pendingInvitations.length})`} className="surface-card">
        {pendingInvitations.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No open invitations." />
        ) : (
          <Flex vertical gap={12}>
            {pendingInvitations.map((item) => (
              <div key={item.id} className="organization-invitation-row">
                <div className="organization-invitation-row__content">
                  <Flex align="center" gap={8}>
                    <MailOutlined />
                    <Typography.Text strong ellipsis={{ tooltip: item.email }}>
                      {item.email}
                    </Typography.Text>
                  </Flex>
                  <Flex wrap gap={4} align="center" className="organization-invitation-row__meta">
                    {item.roles.map((role) => <Tag key={role}>{role}</Tag>)}
                    <Tag color="blue">Pending</Tag>
                    <Typography.Text type="secondary">
                      Expires {new Date(item.expiresAt).toLocaleString("en-US")}
                    </Typography.Text>
                  </Flex>
                </div>
                <Space wrap className="organization-invitation-row__actions">
                  <Button icon={<ReloadOutlined />} onClick={() => resendInvitation(item)} disabled={!canInvite || !emailVerified} loading={isPending}>Resend</Button>
                  <Popconfirm title="Cancel this invitation?" onConfirm={() => cancelInvitation(item.id)}>
                    <Button danger disabled={!canCancelInvitations} loading={isPending}>Cancel</Button>
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </Flex>
        )}
      </Card>

      <Modal title="Invite organization member" open={inviteOpen} onCancel={() => setInviteOpen(false)} footer={null} destroyOnHidden>
        <Form<InviteValues> form={form} layout="vertical" requiredMark={false} initialValues={{ roles: ["member"] }} onFinish={invite}>
          <Form.Item label="Email" name="email" rules={[{ required: true }, { type: "email" }]}><Input /></Form.Item>
          <Form.Item label="Organization roles" name="roles" rules={[{ required: true, type: "array", min: 1 }]}>
            <Select mode="multiple" options={roleOptions} />
          </Form.Item>
          <Form.Item label="Initial team" name="teamId">
            <Select allowClear options={teams.map((team) => ({ label: team.name, value: team.id }))} />
          </Form.Item>
          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" icon={<MailOutlined />} loading={isPending} block>Create invitation</Button>
        </Form>
      </Modal>
    </Flex>
  );
}
