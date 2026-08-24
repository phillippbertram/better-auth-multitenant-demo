"use client";

import {
  createDynamicRole,
  deleteDynamicRole,
  updateDynamicRole,
} from "@/app/organization/actions";
import { organizationStatements } from "@/lib/organization-access";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type RoleItem = {
  id: string;
  role: string;
  permission: Record<string, string[]>;
  isAssigned: boolean;
  isInvited: boolean;
};

const defaultRolePermissions: Record<string, Record<string, string[]>> = {
  owner: {
    organization: ["update", "delete"], member: ["create", "update", "delete"], invitation: ["create", "cancel"], team: ["create", "update", "delete"], ac: ["create", "read", "update", "delete"], note: ["read", "create", "update", "delete", "manage"],
  },
  admin: {
    organization: ["update"], member: ["create", "update", "delete"], invitation: ["create", "cancel"], team: ["create", "update", "delete"], ac: ["create", "read", "update", "delete"], note: ["read", "create", "update", "delete", "manage"],
  },
  member: {
    organization: [], member: [], invitation: [], team: [], ac: ["read"], note: ["read", "create", "update", "delete"],
  },
};

function PermissionMatrix({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, string[]>;
  onChange?: (value: Record<string, string[]>) => void;
  disabled?: boolean;
}) {
  return (
    <Flex vertical gap={12} className="permission-matrix">
      {Object.entries(organizationStatements).map(([resource, actions]) => (
        <div key={resource}>
          <Typography.Text strong style={{ display: "block", marginBottom: 6 }}>{resource}</Typography.Text>
          <Checkbox.Group
            options={actions.map((action) => ({ label: action, value: action }))}
            value={value[resource] ?? []}
            disabled={disabled}
            onChange={(selected) => onChange?.({ ...value, [resource]: selected as string[] })}
          />
        </div>
      ))}
    </Flex>
  );
}

function RoleEditor({
  role,
  open,
  onClose,
}: {
  role: RoleItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(role?.role ?? "");
  const [permissions, setPermissions] = useState<Record<string, string[]>>(
    Object.fromEntries(Object.keys(organizationStatements).map((resource) => [resource, role?.permission[resource] ?? []])),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const lockedName = Boolean(role?.isAssigned || role?.isInvited);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = role
        ? await updateDynamicRole(role.id, role.role, name, permissions)
        : await createDynamicRole(name, permissions);
      if (result.error) {
        setError(result.error);
        return;
      }
      messageApi.success(role ? "Dynamic role updated." : "Dynamic role created.");
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      {contextHolder}
      <Modal title={role ? `Edit ${role.role}` : "Create dynamic role"} open={open} onCancel={onClose} footer={null} width={680} destroyOnHidden>
        <Form layout="vertical" requiredMark={false} onFinish={save}>
          <Form.Item label="Role name" extra={lockedName ? "Assigned roles and roles used in pending invitations cannot be renamed." : undefined}>
            <Input value={name} onChange={(event) => setName(event.target.value.toLowerCase())} disabled={lockedName} placeholder="editor" />
          </Form.Item>
          <Form.Item label="Permissions"><PermissionMatrix value={permissions} onChange={setPermissions} /></Form.Item>
          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" loading={isPending} block>Save role</Button>
        </Form>
      </Modal>
    </>
  );
}

export function OrganizationRoles({
  roles,
  canCreate,
  canRead,
  canUpdate,
  canDelete,
}: {
  roles: RoleItem[];
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<{ key: string; role: RoleItem | null } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const defaultRoles = useMemo(() => Object.entries(defaultRolePermissions), []);

  function remove(role: RoleItem) {
    startTransition(async () => {
      const result = await deleteDynamicRole(role.id, role.role);
      if (result.error) {
        messageApi.error(result.error);
        return;
      }
      messageApi.success("Dynamic role deleted.");
      router.refresh();
    });
  }

  return (
    <Flex vertical gap={24}>
      {contextHolder}
      <Alert type="info" title="Platform roles and organization roles are separate." description="A Platform admin does not automatically receive permissions in an organization. Organization admins are scoped to this tenant." showIcon />

      <div>
        <Typography.Title level={4}>Default roles</Typography.Title>
        <div className="organization-grid">
          {defaultRoles.map(([name, permissions]) => (
            <Card key={name} title={name === "admin" ? "Organization admin" : name} className="surface-card">
              <PermissionMatrix value={permissions} disabled />
            </Card>
          ))}
        </div>
      </div>

      <Card
        title={`Dynamic roles (${roles.length}/10)`}
        extra={<Button type="primary" icon={<PlusOutlined />} disabled={!canCreate || roles.length >= 10} onClick={() => setEditor({ key: crypto.randomUUID(), role: null })}>New role</Button>}
        className="surface-card"
      >
        {!canRead ? (
          <Alert type="warning" title="Your role cannot read dynamic access control." showIcon />
        ) : roles.length === 0 ? (
          <Typography.Text type="secondary">No dynamic roles yet.</Typography.Text>
        ) : (
          <Flex vertical gap={12}>
            {roles.map((role) => {
              const locked = role.isAssigned || role.isInvited;
              return (
                <Flex key={role.id} justify="space-between" align="center" gap={16} wrap className="note-item">
                  <div>
                    <Typography.Text strong>{role.role}</Typography.Text>
                    <br />
                    <Space wrap size={4} style={{ marginTop: 6 }}>
                      {role.isAssigned && <Tag color="blue">Assigned</Tag>}
                      {role.isInvited && <Tag color="purple">Pending invitation</Tag>}
                      <Typography.Text type="secondary">{Object.values(role.permission).reduce((sum, actions) => sum + actions.length, 0)} permissions</Typography.Text>
                    </Space>
                  </div>
                  <Space>
                    <Button icon={<EditOutlined />} disabled={!canUpdate} onClick={() => setEditor({ key: crypto.randomUUID(), role })}>Edit</Button>
                    <Popconfirm title="Delete this dynamic role?" description={locked ? "Remove assignments and cancel invitations first." : "The role will be removed."} onConfirm={() => remove(role)} disabled={!canDelete || locked}>
                      <Button danger icon={<DeleteOutlined />} disabled={!canDelete || locked} loading={isPending}>Delete</Button>
                    </Popconfirm>
                  </Space>
                </Flex>
              );
            })}
          </Flex>
        )}
      </Card>

      {editor && (
        <RoleEditor key={editor.key} role={editor.role} open onClose={() => setEditor(null)} />
      )}
    </Flex>
  );
}
