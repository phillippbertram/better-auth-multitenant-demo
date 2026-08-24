"use client";

import { authClient } from "@/lib/auth-client";
import { DeleteOutlined, ExportOutlined, SaveOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Space,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type OrganizationOverviewProps = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    metadata: Record<string, unknown>;
  };
  canUpdate: boolean;
  canDelete: boolean;
  isLastOwner: boolean;
};

type OrganizationFormValues = {
  name: string;
  slug: string;
  logo?: string;
  metadata: string;
};

export function OrganizationOverview({
  organization,
  canUpdate,
  canDelete,
  isLastOwner,
}: OrganizationOverviewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  function update(values: OrganizationFormValues) {
    setError(null);
    startTransition(async () => {
      let metadata: Record<string, unknown>;
      try {
        metadata = values.metadata.trim() ? JSON.parse(values.metadata) : {};
      } catch {
        setError("Metadata must be a valid JSON object.");
        return;
      }

      const result = await authClient.organization.update({
        organizationId: organization.id,
        data: {
          name: values.name.trim(),
          slug: values.slug.trim(),
          logo: values.logo?.trim() || null,
          metadata,
        },
      });

      if (result.error) {
        setError(result.error.message ?? "Could not update the organization.");
        return;
      }
      messageApi.success("Organization updated.");
      router.refresh();
    });
  }

  function leaveOrganization() {
    startTransition(async () => {
      const result = await authClient.organization.leave({
        organizationId: organization.id,
      });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      router.push("/organizations");
      router.refresh();
    });
  }

  function deleteOrganization() {
    startTransition(async () => {
      const result = await authClient.organization.delete({
        organizationId: organization.id,
      });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      router.push("/organizations");
      router.refresh();
    });
  }

  return (
    <div className="organization-grid">
      {contextHolder}
      <Card title="Organization profile" className="surface-card">
        <Form<OrganizationFormValues>
          layout="vertical"
          requiredMark={false}
          initialValues={{
            name: organization.name,
            slug: organization.slug,
            logo: organization.logo ?? "",
            metadata: JSON.stringify(organization.metadata, null, 2),
          }}
          onFinish={update}
          disabled={!canUpdate}
        >
          <div className="organization-form-grid">
            <Form.Item label="Name" name="name" rules={[{ required: true }, { max: 120 }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Slug" name="slug" rules={[{ required: true, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Logo URL" name="logo" className="organization-form-grid__full" rules={[{ type: "url", warningOnly: true }]}>
              <Input placeholder="https://example.com/logo.svg" />
            </Form.Item>
            <Form.Item label="Metadata (JSON)" name="metadata" className="organization-form-grid__full">
              <Input.TextArea rows={7} spellCheck={false} />
            </Form.Item>
          </div>
          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={isPending} disabled={!canUpdate}>
            Save organization
          </Button>
        </Form>
      </Card>

      <Card title="Membership & deletion" className="surface-card">
        <Typography.Paragraph type="secondary">
          Leaving removes your membership. Deleting removes the organization, all teams, invitations, roles, and notes.
        </Typography.Paragraph>
        {isLastOwner && (
          <Alert
            type="info"
            title="You are the last owner"
            description="Transfer ownership or add another owner before leaving."
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Space wrap>
          <Popconfirm title="Leave this organization?" description={isLastOwner ? "The last owner cannot leave." : "Your membership will be removed."} onConfirm={leaveOrganization} disabled={isLastOwner}>
            <Button icon={<ExportOutlined />} disabled={isLastOwner} loading={isPending}>
              Leave organization
            </Button>
          </Popconfirm>
          <Popconfirm title="Delete this organization?" description="This permanently removes all organization data." okText="Delete" okButtonProps={{ danger: true }} onConfirm={deleteOrganization} disabled={!canDelete}>
            <Button danger icon={<DeleteOutlined />} disabled={!canDelete} loading={isPending}>
              Delete organization
            </Button>
          </Popconfirm>
        </Space>
      </Card>
    </div>
  );
}
