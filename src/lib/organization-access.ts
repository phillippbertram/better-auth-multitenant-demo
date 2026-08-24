import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

export const organizationStatements = {
  ...defaultStatements,
  note: ["read", "create", "update", "delete", "manage"],
} as const;

export const organizationAccessControl = createAccessControl(
  organizationStatements,
);

export const organizationOwnerRole = organizationAccessControl.newRole({
  ...ownerAc.statements,
  note: ["read", "create", "update", "delete", "manage"],
});

export const organizationAdminRole = organizationAccessControl.newRole({
  ...adminAc.statements,
  note: ["read", "create", "update", "delete", "manage"],
});

export const organizationMemberRole = organizationAccessControl.newRole({
  ...memberAc.statements,
  note: ["read", "create", "update", "delete"],
});

export const organizationRoles = {
  owner: organizationOwnerRole,
  admin: organizationAdminRole,
  member: organizationMemberRole,
};

export const ORGANIZATION_LIMITS = {
  organizationsPerUser: 5,
  membersPerOrganization: 100,
  pendingInvitations: 50,
  invitationExpiresInSeconds: 60 * 60 * 48,
  teamsPerOrganization: 10,
  membersPerTeam: 100,
  dynamicRolesPerOrganization: 10,
} as const;

export type NotePermission =
  (typeof organizationStatements.note)[number];

export function splitOrganizationRoles(role: string | null | undefined) {
  return (role ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
