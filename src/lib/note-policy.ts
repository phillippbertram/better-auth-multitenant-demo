import type { NotePermission } from "@/lib/organization-access";

export type NotePermissionSet = Record<NotePermission, boolean>;

export function canMutateNote(input: {
  action: "update" | "delete";
  isAuthor: boolean;
  permissions: NotePermissionSet;
  platformAdmin?: boolean;
}) {
  if (input.platformAdmin) {
    return true;
  }

  if (input.isAuthor) {
    return input.permissions[input.action];
  }

  return input.permissions.manage;
}

export function canReadNoteInContext(input: {
  activeOrganizationId: string;
  noteOrganizationId: string;
  canRead: boolean;
  platformAdmin?: boolean;
}) {
  if (input.platformAdmin) return true;
  return (
    input.activeOrganizationId === input.noteOrganizationId && input.canRead
  );
}

export function canAssignNoteTeam(input: {
  organizationId: string;
  teamOrganizationId: string | null;
}) {
  return (
    input.teamOrganizationId === null ||
    input.teamOrganizationId === input.organizationId
  );
}

export function isNoteVisibleInTeamFilter(input: {
  activeTeamId: string | null;
  noteTeamId: string | null;
}) {
  return input.activeTeamId === null || input.activeTeamId === input.noteTeamId;
}
