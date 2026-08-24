"use client";

import { NotesManager, type NoteItem } from "@/components/notes-manager";
import { PageHeader } from "@/components/layout/page-header";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import { Flex, Tag, Typography } from "antd";

type NotesContentProps = {
  user: {
    name: string;
    email: string;
  };
  notes: NoteItem[];
  canCreate: boolean;
  organization: { id: string; name: string; slug: string };
  teams: { id: string; name: string }[];
  activeTeam: { id: string; name: string } | null;
};

export function NotesContent({
  user,
  notes,
  canCreate,
  organization,
  teams,
  activeTeam,
}: NotesContentProps) {
  const pageTitle = activeTeam
    ? `${activeTeam.name} notes`
    : organization.name.toLowerCase().endsWith("notes")
      ? organization.name
      : `${organization.name} notes`;

  return (
    <>
      <div className="notes-page__header">
        <PageHeader
          title={pageTitle}
          description={
            <>
              {activeTeam && `${organization.name} · `}
              Signed in as <Typography.Text strong>{user.email}</Typography.Text>
            </>
          }
        />

        <Flex
          align="center"
          gap={16}
          className="privacy-banner"
        >
          <Flex align="center" gap={12} className="privacy-banner__content">
            <span className="privacy-banner__icon" aria-hidden="true">
              <SafetyCertificateOutlined />
            </span>
            <div className="privacy-banner__copy">
              <Flex
                align="start"
                justify="space-between"
                gap={12}
                className="privacy-banner__heading"
              >
                <Typography.Text strong>
                  {activeTeam
                    ? `${activeTeam.name} team workspace`
                    : "All organization notes"}
                </Typography.Text>
                <Tag color="blue">
                  {notes.length} {notes.length === 1 ? "note" : "notes"}
                </Tag>
              </Flex>
              <Typography.Paragraph type="secondary">
                {activeTeam
                  ? `Showing notes assigned to ${activeTeam.name}. Everyone in ${organization.name} can still find them in All organization notes.`
                  : `Team assignments organize the work in ${organization.name}; visibility and editing permissions remain organization-wide.`}
              </Typography.Paragraph>
            </div>
          </Flex>
        </Flex>
      </div>

      <NotesManager
        notes={notes}
        canCreate={canCreate}
        teams={teams}
        activeTeam={activeTeam}
      />
    </>
  );
}
