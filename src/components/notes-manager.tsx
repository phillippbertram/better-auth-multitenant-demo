"use client";

import {
  createNoteForUser,
  deleteNoteForUser,
  updateNoteForUser,
} from "@/app/admin/actions";
import {
  createNote,
  deleteNote,
  updateNote,
  type NoteActionState,
} from "@/app/notes/actions";
import {
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
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export type NoteItem = {
  id: string;
  title: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  organization: { id: string; name: string };
  team: { id: string; name: string } | null;
  author: { id: string; name: string; email: string };
  canEdit: boolean;
  canDelete: boolean;
};

type NotesManagerProps = {
  notes: NoteItem[];
  canCreate?: boolean;
  teams?: { id: string; name: string }[];
  activeTeam?: { id: string; name: string } | null;
  adminTarget?: {
    id: string;
    name: string;
    organizations: {
      id: string;
      name: string;
      teams: { id: string; name: string }[];
    }[];
  };
};

type NoteFormValues = {
  title: string;
  content: string;
  organizationId?: string;
  teamId?: string;
};

const ORGANIZATION_WIDE_TEAM_VALUE = "__organization_wide__";

function formatUpdatedAt(value: Date | string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "?";
}

function EditNoteModal({
  note,
  adminTarget,
  teams,
  onClose,
  onSaved,
}: {
  note: NoteItem;
  adminTarget?: NotesManagerProps["adminTarget"];
  teams: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();

  function handleUpdate(values: NoteFormValues) {
    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("content", values.content);
    formData.set("organizationId", note.organization.id);
    formData.set("teamId", values.teamId ?? ORGANIZATION_WIDE_TEAM_VALUE);
    setEditError(null);

    startTransition(async () => {
      const result = adminTarget
        ? await updateNoteForUser(adminTarget.id, note.id, {}, formData)
        : await updateNote(note.id, {}, formData);

      if (result.error) {
        setEditError(result.error);
        return;
      }

      messageApi.success("Note updated.");
      onSaved();
      router.refresh();
    });
  }

  return (
    <>
      {contextHolder}
      <Modal title="Edit note" open onCancel={onClose} footer={null} destroyOnHidden>
        <Form<NoteFormValues>
          layout="vertical"
          requiredMark={false}
          initialValues={{
            title: note.title,
            content: note.content,
            teamId: note.team?.id ?? ORGANIZATION_WIDE_TEAM_VALUE,
          }}
          onFinish={handleUpdate}
        >
          <Form.Item label="Organization">
            <Input value={note.organization.name} disabled />
          </Form.Item>
          <Form.Item label="Workspace" name="teamId">
            <Select
              options={[
                {
                  label: "Organization-wide",
                  value: ORGANIZATION_WIDE_TEAM_VALUE,
                },
                ...teams.map((item) => ({
                  label: item.name,
                  value: item.id,
                })),
              ]}
            />
          </Form.Item>
          <Form.Item label="Title" name="title" rules={[{ required: true }, { max: 120 }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Content" name="content" rules={[{ required: true }, { max: 5000 }]}>
            <Input.TextArea rows={5} showCount maxLength={5000} />
          </Form.Item>
          {editError && <Alert type="error" title={editError} showIcon />}
          <Flex gap={8} style={{ marginTop: 20 }}>
            <Button type="primary" htmlType="submit" loading={isPending}>
              Save changes
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </Flex>
        </Form>
      </Modal>
    </>
  );
}

export function NotesManager({
  notes,
  canCreate = true,
  teams = [],
  activeTeam = null,
  adminTarget,
}: NotesManagerProps) {
  const router = useRouter();
  const [createForm] = Form.useForm<NoteFormValues>();
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const canShowComposer = canCreate && (!adminTarget || adminTarget.organizations.length > 0);
  const selectedOrganizationId = Form.useWatch("organizationId", createForm);
  const availableCreateTeams = adminTarget
    ? (adminTarget.organizations.find(
        (item) => item.id === selectedOrganizationId,
      )?.teams ?? [])
    : teams;

  useEffect(() => {
    if (!adminTarget) {
      createForm.setFieldValue(
        "teamId",
        activeTeam?.id ?? ORGANIZATION_WIDE_TEAM_VALUE,
      );
    }
  }, [activeTeam?.id, adminTarget, createForm]);

  function handleCreate(values: NoteFormValues) {
    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("content", values.content);
    formData.set("teamId", values.teamId ?? ORGANIZATION_WIDE_TEAM_VALUE);
    if (values.organizationId) {
      formData.set("organizationId", values.organizationId);
    }
    setCreateError(null);

    startTransition(async () => {
      const result: NoteActionState = adminTarget
        ? await createNoteForUser(adminTarget.id, {}, formData)
        : await createNote({}, formData);

      if (result.error) {
        setCreateError(result.error);
        return;
      }

      createForm.resetFields();
      messageApi.success("Note created.");
      router.refresh();
    });
  }

  function handleDelete(item: NoteItem) {
    startTransition(async () => {
      const result = adminTarget
        ? await deleteNoteForUser(adminTarget.id, item.id)
        : await deleteNote(item.id);

      if (result.error) {
        messageApi.error(result.error);
        return;
      }

      messageApi.success("Note deleted.");
      router.refresh();
    });
  }

  return (
    <>
      {contextHolder}
      <div className="notes-layout">
        <section className="note-composer" aria-label="Create a note">
          <Card
            title={<Space><PlusOutlined />New note</Space>}
            className="surface-card"
          >
            {canShowComposer ? (
              <Form<NoteFormValues>
                form={createForm}
                layout="vertical"
                requiredMark={false}
                onFinish={handleCreate}
                initialValues={
                  adminTarget?.organizations[0]
                    ? {
                        organizationId: adminTarget.organizations[0].id,
                        teamId: ORGANIZATION_WIDE_TEAM_VALUE,
                      }
                    : {
                        teamId:
                          activeTeam?.id ?? ORGANIZATION_WIDE_TEAM_VALUE,
                      }
                }
                onValuesChange={(changedValues) => {
                  if ("organizationId" in changedValues) {
                    createForm.setFieldValue(
                      "teamId",
                      ORGANIZATION_WIDE_TEAM_VALUE,
                    );
                  }
                }}
              >
                {adminTarget && (
                  <Form.Item
                    label="Organization"
                    name="organizationId"
                    rules={[{ required: true, message: "Select an organization." }]}
                  >
                    <Select
                      options={adminTarget.organizations.map((item) => ({
                        label: item.name,
                        value: item.id,
                      }))}
                    />
                  </Form.Item>
                )}
                <Form.Item label="Workspace" name="teamId">
                  <Select
                    options={[
                      {
                        label: "Organization-wide",
                        value: ORGANIZATION_WIDE_TEAM_VALUE,
                      },
                      ...availableCreateTeams.map((item) => ({
                        label: item.name,
                        value: item.id,
                      })),
                    ]}
                  />
                </Form.Item>
                <Form.Item label="Title" name="title" rules={[{ required: true }, { max: 120 }]}>
                  <Input placeholder="Release plan" />
                </Form.Item>
                <Form.Item label="Content" name="content" rules={[{ required: true }, { max: 5000 }]}>
                  <Input.TextArea rows={7} showCount maxLength={5000} placeholder="Write a note for the organization..." />
                </Form.Item>
                {createError && <Alert type="error" title={createError} showIcon style={{ marginBottom: 16 }} />}
                <Button type="primary" htmlType="submit" loading={isPending} icon={<PlusOutlined />} block>
                  Create note
                </Button>
              </Form>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  adminTarget
                    ? "This user is not a member of an organization."
                    : "Your role cannot create notes."
                }
              />
            )}
          </Card>
        </section>

        <section className="notes-list" aria-label="Organization notes">
          <Card
            title={
              <Space>
                <FileTextOutlined />
                {activeTeam ? `${activeTeam.name} notes` : "All organization notes"}
              </Space>
            }
            extra={<Tag>{notes.length}</Tag>}
            className="surface-card"
          >
            {notes.length === 0 ? (
              <Empty
                description={
                  activeTeam
                    ? `No notes are assigned to ${activeTeam.name} yet.`
                    : "No notes in this organization yet."
                }
              />
            ) : (
              <Flex vertical gap={12}>
                {notes.map((item) => (
                  <article key={item.id} className="note-item">
                    <Flex justify="space-between" align="start" gap={16} className="note-item__layout">
                      <div className="note-item__content">
                        <Flex gap={8} wrap align="center">
                          <Typography.Title level={5}>{item.title}</Typography.Title>
                          {adminTarget && <Tag color="blue">{item.organization.name}</Tag>}
                          <Tag
                            icon={item.team ? <TeamOutlined /> : undefined}
                            color={item.team ? "purple" : "default"}
                          >
                            {item.team?.name ?? "Organization-wide"}
                          </Tag>
                        </Flex>
                        <Typography.Paragraph ellipsis={{ rows: 4, expandable: true, symbol: "more" }}>
                          {item.content}
                        </Typography.Paragraph>
                        <Flex align="center" gap={8} className="note-item__meta">
                          <Tooltip title={item.author.name}>
                            <Avatar
                              size={24}
                              className="note-item__author-avatar"
                              aria-label={`Author: ${item.author.name}`}
                            >
                              {getInitials(item.author.name)}
                            </Avatar>
                          </Tooltip>
                          <Typography.Text type="secondary" className="note-item__date">
                            Updated {formatUpdatedAt(item.updatedAt)}
                          </Typography.Text>
                        </Flex>
                      </div>
                      {(item.canEdit || item.canDelete) && (
                        <Space size={4} className="note-item__actions">
                          {item.canEdit && (
                            <Button type="text" icon={<EditOutlined />} aria-label={`Edit ${item.title}`} onClick={() => setEditingNote(item)} />
                          )}
                          {item.canDelete && (
                            <Popconfirm
                              title="Delete this note?"
                              description="This action cannot be undone."
                              okText="Delete"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDelete(item)}
                            >
                              <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Delete ${item.title}`} loading={isPending} />
                            </Popconfirm>
                          )}
                        </Space>
                      )}
                    </Flex>
                  </article>
                ))}
              </Flex>
            )}
          </Card>
        </section>
      </div>
      {editingNote && (
        <EditNoteModal
          note={editingNote}
          adminTarget={adminTarget}
          teams={
            adminTarget?.organizations.find(
              (item) => item.id === editingNote.organization.id,
            )?.teams ?? teams
          }
          onClose={() => setEditingNote(null)}
          onSaved={() => setEditingNote(null)}
        />
      )}
    </>
  );
}
