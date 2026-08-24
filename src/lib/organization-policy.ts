import { splitOrganizationRoles } from "@/lib/organization-access";

export function canDeleteTeam(input: {
  teamCount: number;
  teamId: string;
  activeTeamId: string | null;
  hasPermission: boolean;
}) {
  return (
    input.hasPermission &&
    input.teamCount > 1 &&
    input.teamId !== input.activeTeamId
  );
}

export function canMutateDynamicRole(input: {
  isAssigned: boolean;
  isUsedByPendingInvitation: boolean;
  hasPermission: boolean;
}) {
  return (
    input.hasPermission &&
    !input.isAssigned &&
    !input.isUsedByPendingInvitation
  );
}

export function canChangeOwnerMembership(input: {
  currentRole: string;
  nextRoles: string[];
  ownerCount: number;
  updaterRoles: string;
}) {
  const isOwner = splitOrganizationRoles(input.currentRole).includes("owner");
  const remainsOwner = input.nextRoles.includes("owner");
  const updaterIsOwner = splitOrganizationRoles(input.updaterRoles).includes("owner");

  if ((isOwner || remainsOwner) && !updaterIsOwner) return false;
  if (isOwner && !remainsOwner && input.ownerCount <= 1) return false;
  return true;
}

export function canUseInvitation(input: {
  currentEmail: string;
  invitationEmail: string;
  emailVerified: boolean;
}) {
  return (
    input.emailVerified &&
    input.currentEmail.toLowerCase() === input.invitationEmail.toLowerCase()
  );
}

export function hasPermissionAcrossRoles(
  roles: string,
  permissionMatrices: Record<string, Record<string, readonly string[]>>,
  resource: string,
  action: string,
) {
  return splitOrganizationRoles(roles).some((role) =>
    permissionMatrices[role]?.[resource]?.includes(action),
  );
}
