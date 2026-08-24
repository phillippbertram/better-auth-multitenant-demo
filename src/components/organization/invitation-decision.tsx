"use client";

import { PageHeader } from "@/components/layout/page-header";
import { authClient } from "@/lib/auth-client";
import { CheckOutlined, CloseOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Space, Tag, message } from "antd";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function InvitationDecision({
  invitation,
}: {
  invitation: {
    id: string;
    email: string;
    role: string;
    teamId?: string | null;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    inviterEmail: string;
    expiresAt: Date | string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  function respond(accept: boolean) {
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
        messageApi.success(`Welcome to ${invitation.organizationName}.`);
        router.push("/notes");
      } else {
        messageApi.success("Invitation declined.");
        router.push("/organizations");
      }
      router.refresh();
    });
  }

  return (
    <>
      {contextHolder}
      <PageHeader title={`Join ${invitation.organizationName}`} description="Review this organization invitation before accepting it." />
      <Card className="surface-card" style={{ maxWidth: 720 }}>
        <Alert type="info" icon={<MailOutlined />} title={`Invitation for ${invitation.email}`} description="Only the verified recipient can accept or decline this invitation." showIcon style={{ marginBottom: 20 }} />
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Organization">{invitation.organizationName} <Tag>/{invitation.organizationSlug}</Tag></Descriptions.Item>
          <Descriptions.Item label="Invited by">{invitation.inviterEmail}</Descriptions.Item>
          <Descriptions.Item label="Roles">
            <Space wrap>{invitation.role.split(",").map((role) => <Tag color="blue" key={role}>{role.trim()}</Tag>)}</Space>
          </Descriptions.Item>
          <Descriptions.Item label="Expires">{new Date(invitation.expiresAt).toLocaleString("en-US")}</Descriptions.Item>
        </Descriptions>
        <Space style={{ marginTop: 24 }}>
          <Button type="primary" icon={<CheckOutlined />} onClick={() => respond(true)} loading={isPending}>Accept invitation</Button>
          <Button icon={<CloseOutlined />} onClick={() => respond(false)} loading={isPending}>Decline</Button>
        </Space>
      </Card>
    </>
  );
}
