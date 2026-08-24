"use client";

import { authClient } from "@/lib/auth-client";
import { getAuthenticatorName, type Passkey } from "@better-auth/passkey";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

function getPasskeyLabel(passkey: Passkey) {
  return (
    passkey.name ||
    getAuthenticatorName(passkey.aaguid) ||
    "Passkey"
  );
}

function getPasskeyStorageLabel(passkey: Passkey) {
  if (passkey.deviceType === "singleDevice") {
    return "Device-bound";
  }

  return passkey.backedUp ? "Synced" : "Sync-capable";
}

function subscribe() {
  return () => {};
}

function getPasskeySupported() {
  return typeof PublicKeyCredential !== "undefined";
}

function RenamePasskeyModal({
  passkey,
  loading,
  onClose,
  onRename,
}: {
  passkey: Passkey;
  loading: boolean;
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
}) {
  const [form] = Form.useForm<{ name: string }>();

  return (
    <Modal title="Rename passkey" open onCancel={onClose} footer={null} destroyOnHidden>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: getPasskeyLabel(passkey) }}
        onFinish={async (values) => {
          await onRename(values.name.trim());
        }}
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Please enter a name." }]}
        >
          <Input placeholder="Work laptop" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Passkey | null>(null);
  const passkeySupported = useSyncExternalStore(
    subscribe,
    getPasskeySupported,
    () => true,
  );

  const loadPasskeys = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await authClient.passkey.listUserPasskeys();

      if (result.error) {
        setError(result.error.message ?? "Could not load passkeys.");
        setPasskeys([]);
        return;
      }

      setPasskeys(result.data ?? []);
    } catch {
      setError("Could not load passkeys.");
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void authClient.passkey
      .listUserPasskeys()
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.error) {
          setError(result.error.message ?? "Could not load passkeys.");
          setPasskeys([]);
          return;
        }

        setPasskeys(result.data ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load passkeys.");
          setPasskeys([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddPasskey() {
    if (!passkeySupported) {
      setError("Passkeys are not supported in this browser.");
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const result = await authClient.passkey.addPasskey();

      if (result.error) {
        setError(result.error.message ?? "Could not add passkey.");
        return;
      }

      await loadPasskeys(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not add passkey.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRename(name: string) {
    if (!renameTarget) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const result = await authClient.passkey.updatePasskey({
        id: renameTarget.id,
        name,
      });

      if (result.error) {
        setError(result.error.message ?? "Could not rename passkey.");
        return;
      }

      setRenameTarget(null);
      await loadPasskeys(false);
    } catch {
      setError("Could not rename passkey.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(true);
    setError(null);

    try {
      const result = await authClient.passkey.deletePasskey({ id });

      if (result.error) {
        setError(result.error.message ?? "Could not delete passkey.");
        return;
      }

      await loadPasskeys(false);
    } catch {
      setError("Could not delete passkey.");
    } finally {
      setActionLoading(false);
    }
  }

  const columns: ColumnsType<Passkey> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (_, record) => getPasskeyLabel(record),
    },
    {
      title: "Type",
      dataIndex: "deviceType",
      key: "deviceType",
      render: (_, record) => getPasskeyStorageLabel(record),
      responsive: ["md"],
    },
    {
      title: "Added",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: Passkey["createdAt"]) =>
        value
          ? new Date(value).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
      responsive: ["md"],
    },
    {
      title: "Actions",
      key: "actions",
      width: 104,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={`Rename ${getPasskeyLabel(record)}`}
            disabled={actionLoading}
            onClick={() => setRenameTarget(record)}
          />
          <Popconfirm
            title="Remove this passkey?"
            description={
              passkeys.length === 1
                ? "This is your only passkey. You won't be able to sign in with a passkey until you register a new one."
                : "You won't be able to sign in with it anymore."
            }
            okText="Remove"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Delete ${getPasskeyLabel(record)}`}
              disabled={actionLoading}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space
        orientation="vertical"
        size={16}
        style={{ width: "100%", marginBottom: 16 }}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Add one or more passkeys for passwordless sign-in. The type shows
          whether a passkey stays on one device or can sync to others.
        </Typography.Paragraph>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={actionLoading}
          disabled={!passkeySupported}
          onClick={handleAddPasskey}
        >
          Add passkey
        </Button>

        {!passkeySupported && (
          <Alert
            type="warning"
            title="Passkeys not supported"
            description="Your browser does not support WebAuthn passkeys."
            showIcon
          />
        )}

        {error && <Alert type="error" title={error} showIcon />}
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={passkeys}
        loading={loading}
        pagination={false}
        locale={{ emptyText: "No passkeys registered yet." }}
      />

      {renameTarget && (
        <RenamePasskeyModal
          passkey={renameTarget}
          loading={actionLoading}
          onClose={() => setRenameTarget(null)}
          onRename={handleRename}
        />
      )}
    </>
  );
}
