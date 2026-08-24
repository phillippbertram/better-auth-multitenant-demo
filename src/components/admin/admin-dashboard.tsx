"use client";

import {
  banUser,
  createAdminUser,
  removeUser,
  setUserRole,
  unbanUser,
  type AdminActionState,
} from "@/app/admin/actions";
import { isAdminRole } from "@/lib/roles";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Dropdown,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { MenuProps, TableColumnsType } from "antd";
import {
  MoreOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
  UserSwitchOutlined,
  StopOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt: Date | string;
};

type AdminStats = {
  total: number;
  admins: number;
  banned: number;
  active: number;
};

type AdminDashboardProps = {
  users: AdminUser[];
  total: number;
  stats: AdminStats;
};

type CreateUserFormValues = {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
};

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminDashboard({ users, total, stats }: AdminDashboardProps) {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    );
  }, [users, search]);

  function handleCreate(values: CreateUserFormValues) {
    setCreateError(null);

    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("role", values.role);

    startTransition(async () => {
      const result: AdminActionState = await createAdminUser({}, formData);

      if (result.error) {
        setCreateError(result.error);
        return;
      }

      setCreateOpen(false);
      messageApi.success("User created.");
      router.refresh();
    });
  }

  function runAction(action: () => Promise<AdminActionState>, successMessage: string) {
    startTransition(async () => {
      const result = await action();

      if (result.error) {
        messageApi.error(result.error);
        return;
      }

      messageApi.success(successMessage);
      router.refresh();
    });
  }

  function getActionItems(record: AdminUser): MenuProps["items"] {
    const currentRole = isAdminRole(record.role) ? "admin" : "user";

    return [
      {
        key: "role-user",
        label: "Set role: User",
        disabled: currentRole === "user",
        onClick: () =>
          runAction(() => setUserRole(record.id, "user"), "Role updated."),
      },
      {
        key: "role-admin",
        label: "Set role: Platform admin",
        disabled: currentRole === "admin",
        onClick: () =>
          runAction(() => setUserRole(record.id, "admin"), "Role updated."),
      },
      { type: "divider" },
      record.banned
        ? {
            key: "unban",
            label: "Unban user",
            onClick: () =>
              runAction(() => unbanUser(record.id), "User unbanned."),
          }
        : {
            key: "ban",
            label: "Ban user",
            danger: true,
            onClick: () =>
              runAction(
                () => banUser(record.id, "Banned by admin"),
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
              runAction(() => removeUser(record.id), "User deleted.")
            }
          >
            <span style={{ color: "inherit" }}>Delete user</span>
          </Popconfirm>
        ),
        danger: true,
      },
    ];
  }

  const columns: TableColumnsType<AdminUser> = [
    {
      title: "User",
      key: "user",
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <Flex vertical gap={0}>
            <Link href={`/admin/users/${record.id}`}>{record.name}</Link>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Typography.Text>
          </Flex>
        </Space>
      ),
    },
    {
      title: "Platform role",
      dataIndex: "role",
      key: "role",
      render: (role: string | null | undefined) => (
        <Tag color={isAdminRole(role) ? "gold" : "default"}>
          {isAdminRole(role) ? "Platform admin" : "User"}
        </Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) =>
        record.banned ? (
          <Tag color="red" icon={<StopOutlined />}>
            Banned
          </Tag>
        ) : (
          <Tag color="green">Active</Tag>
        ),
    },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: Date | string) => formatDate(value),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 96,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionItems(record) }} trigger={["click"]}>
          <Button
            type="text"
            icon={<MoreOutlined />}
            loading={isPending}
            aria-label={`Actions for ${record.name}`}
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="surface-card stat-card">
            <Statistic
              title="Total users"
              value={stats.total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="surface-card stat-card">
            <Statistic
              title="Platform admins"
              value={stats.admins}
              prefix={<UserSwitchOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="surface-card stat-card">
            <Statistic
              title="Active"
              value={stats.active}
              styles={{ content: { color: "#3f8600" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="surface-card stat-card">
            <Statistic
              title="Banned"
              value={stats.banned}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Users"
        extra={
          <Space wrap className="admin-toolbar">
            <Input.Search
              allowClear
              placeholder="Search by name or email"
              className="admin-toolbar__search"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
            >
              Create user
            </Button>
          </Space>
        }
        className="surface-card"
      >
        <Table
          rowKey="id"
          dataSource={filteredUsers}
          columns={columns}
          pagination={{ pageSize: 10, showTotal: (count) => `${count} users` }}
          scroll={{ x: 800 }}
          footer={() => (
            <Typography.Text type="secondary">
              {total} total registered users
            </Typography.Text>
          )}
        />
      </Card>

      {createOpen && (
        <CreateUserModal
          error={createError}
          isPending={isPending}
          onClose={() => {
            setCreateOpen(false);
            setCreateError(null);
          }}
          onCreate={handleCreate}
        />
      )}
    </>
  );
}

function CreateUserModal({
  error,
  isPending,
  onClose,
  onCreate,
}: {
  error: string | null;
  isPending: boolean;
  onClose: () => void;
  onCreate: (values: CreateUserFormValues) => void;
}) {
  const [form] = Form.useForm<CreateUserFormValues>();

  return (
    <Modal title="Create user" open onCancel={onClose} footer={null} destroyOnHidden>
      <Form<CreateUserFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ role: "user" }}
        onFinish={onCreate}
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Please enter a name." }]}
        >
          <Input placeholder="Jane Doe" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Please enter an email." },
            { type: "email", message: "Please enter a valid email." },
          ]}
        >
          <Input placeholder="jane@example.com" />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[
            { required: true, message: "Please enter a password." },
            { min: 8, message: "Password must be at least 8 characters." },
          ]}
        >
          <Input.Password placeholder="At least 8 characters" />
        </Form.Item>

        <Form.Item label="Role" name="role" rules={[{ required: true }]}>
          <Select
            options={[
              { label: "User", value: "user" },
              { label: "Platform admin", value: "admin" },
            ]}
          />
        </Form.Item>

        {error && (
          <Form.Item>
            <Alert type="error" title={error} showIcon />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isPending}>
              Create user
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
