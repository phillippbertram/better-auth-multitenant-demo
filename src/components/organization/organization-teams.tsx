"use client";

import { authClient } from "@/lib/auth-client";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
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
import { canDeleteTeam } from "@/lib/organization-policy";

type TeamMemberItem = { id: string; userId: string; name: string; email: string };
type TeamItem = {
  id: string;
  name: string;
  memberCount: number;
  noteCount: number;
  members: TeamMemberItem[];
};
type MemberItem = { userId: string; name: string; email: string };

export function OrganizationTeams({
  organizationId,
  currentUserId,
  teams,
  members,
  activeTeamId,
  canCreate,
  canUpdate,
  canDelete,
}: {
  organizationId: string;
  currentUserId: string;
  teams: TeamItem[];
  members: MemberItem[];
  activeTeamId: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [form] = Form.useForm<{ name: string }>();
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "rename"; team: TeamItem } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();

  function saveTeam(values: { name: string }) {
    if (!modal) return;
    setError(null);
    startTransition(async () => {
      const result = modal.mode === "create"
        ? await authClient.organization.createTeam({ name: values.name.trim(), organizationId })
        : await authClient.organization.updateTeam({ teamId: modal.team.id, data: { name: values.name.trim(), organizationId } });
      if (result.error) {
        setError(result.error.message ?? "Could not save the team.");
        return;
      }
      messageApi.success(modal.mode === "create" ? "Team created." : "Team renamed.");
      setModal(null);
      form.resetFields();
      router.refresh();
    });
  }

  function openTeamWorkspace(team: TeamItem) {
    startTransition(async () => {
      if (activeTeamId !== team.id) {
        const result = await authClient.organization.setActiveTeam({
          teamId: team.id,
        });
        if (result.error) {
          messageApi.error(result.error.message);
          return;
        }
      }
      router.push("/notes");
      router.refresh();
    });
  }

  function deleteTeam(team: TeamItem) {
    startTransition(async () => {
      const result = await authClient.organization.removeTeam({ teamId: team.id, organizationId });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      messageApi.success("Team deleted.");
      router.refresh();
    });
  }

  function addMember(team: TeamItem, userId: string) {
    startTransition(async () => {
      const result = await authClient.organization.addTeamMember({ teamId: team.id, userId, organizationId });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  function removeMember(team: TeamItem, userId: string) {
    startTransition(async () => {
      const result = await authClient.organization.removeTeamMember({ teamId: team.id, userId, organizationId });
      if (result.error) {
        messageApi.error(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {contextHolder}
      <Flex justify="space-between" align="center" gap={16} wrap style={{ marginBottom: 18 }}>
        <Alert
          type="info"
          title="Teams organize notes into focused workspaces."
          description="The active team filters the Notes page. Team assignments never restrict organization-wide visibility."
          showIcon
        />
        <Button type="primary" icon={<PlusOutlined />} disabled={!canCreate} onClick={() => { setModal({ mode: "create" }); form.setFieldsValue({ name: "" }); }}>New team</Button>
      </Flex>
      <div className="organization-grid">
        {teams.map((team) => {
          const availableMembers = members.filter((member) => !team.members.some((teamMember) => teamMember.userId === member.userId));
          const mayDelete = canDeleteTeam({
            teamCount: teams.length,
            teamId: team.id,
            activeTeamId,
            hasPermission: canDelete,
          });
          const currentUserIsMember = team.members.some(
            (item) => item.userId === currentUserId,
          );
          return (
            <Card
              key={team.id}
              title={<Space><TeamOutlined />{team.name}{activeTeamId === team.id && <Tag color="green">Active</Tag>}</Space>}
              extra={
                <Space>
                  <Button type="text" icon={<EditOutlined />} aria-label={`Rename ${team.name}`} disabled={!canUpdate} onClick={() => { setModal({ mode: "rename", team }); form.setFieldsValue({ name: team.name }); }} />
                  <Popconfirm title="Delete this team?" description={activeTeamId === team.id ? "Open another team or All organization notes first." : teams.length === 1 ? "Every organization needs at least one team." : "Its notes become organization-wide and team memberships are removed."} onConfirm={() => deleteTeam(team)} disabled={!mayDelete}>
                    <Button danger type="text" icon={<DeleteOutlined />} aria-label={`Delete ${team.name}`} disabled={!mayDelete} />
                  </Popconfirm>
                </Space>
              }
              className="surface-card"
            >
              <Flex
                align="center"
                justify="space-between"
                gap={16}
                wrap
                className="organization-team-card__toolbar"
              >
                <Button
                  icon={
                    activeTeamId === team.id ? (
                      <CheckCircleOutlined />
                    ) : (
                      <FileTextOutlined />
                    )
                  }
                  onClick={() => openTeamWorkspace(team)}
                  disabled={!currentUserIsMember}
                  title={
                    currentUserIsMember
                      ? undefined
                      : "Join this team before opening its workspace."
                  }
                >
                  Open notes
                </Button>
                <Flex
                  align="center"
                  gap={12}
                  wrap
                  className="organization-team-card__metrics"
                >
                  <Typography.Text type="secondary">
                    {team.noteCount} {team.noteCount === 1 ? "note" : "notes"}
                  </Typography.Text>
                  <Typography.Text type="secondary" className="organization-team-card__count">
                    {team.members.length} of 100 members
                  </Typography.Text>
                </Flex>
              </Flex>
              <Flex vertical gap={8} style={{ marginTop: 12 }}>
                {team.members.map((item) => (
                  <Flex key={item.id} justify="space-between" align="center" gap={8}>
                    <Flex gap={8} align="center" style={{ minWidth: 0 }}>
                      <Avatar size="small">{item.name.slice(0, 1)}</Avatar>
                      <Typography.Text ellipsis>{item.name}</Typography.Text>
                    </Flex>
                    <Button size="small" type="text" danger onClick={() => removeMember(team, item.userId)} disabled={!canUpdate || isPending}>Remove</Button>
                  </Flex>
                ))}
              </Flex>
              <Select<string>
                style={{ width: "100%", marginTop: 16 }}
                placeholder="Add organization member"
                value={undefined}
                options={availableMembers.map((item) => ({ label: `${item.name} (${item.email})`, value: item.userId }))}
                onChange={(userId) => addMember(team, userId)}
                disabled={!canUpdate || availableMembers.length === 0 || isPending}
              />
            </Card>
          );
        })}
      </div>

      <Modal title={modal?.mode === "rename" ? "Rename team" : "Create team"} open={Boolean(modal)} onCancel={() => setModal(null)} footer={null} destroyOnHidden>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={saveTeam}>
          <Form.Item label="Team name" name="name" rules={[{ required: true }, { max: 120 }]}><Input /></Form.Item>
          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" loading={isPending} block>Save team</Button>
        </Form>
      </Modal>
    </>
  );
}
