import { db } from "@/db";
import {
  invitation,
  member,
  organization,
  organizationRole,
  team,
  teamMember,
  user,
} from "@/db/auth-schema";
import { note } from "@/db/note-schema";
import { splitOrganizationRoles } from "@/lib/organization-access";
import {
  hasOrganizationPermission,
  requireOrganizationSession,
} from "@/lib/organization-session";
import { and, asc, eq } from "drizzle-orm";

const permissionChecks = [
  ["organization", "update"],
  ["organization", "delete"],
  ["member", "update"],
  ["member", "delete"],
  ["invitation", "create"],
  ["invitation", "cancel"],
  ["team", "create"],
  ["team", "update"],
  ["team", "delete"],
  ["ac", "create"],
  ["ac", "read"],
  ["ac", "update"],
  ["ac", "delete"],
] as const;

function parseMetadata(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parsePermission(value: string) {
  try {
    return JSON.parse(value) as Record<string, string[]>;
  } catch {
    return {};
  }
}

export async function getOrganizationWorkspaceData() {
  const context = await requireOrganizationSession();

  const [organizationItem, members, invitations, teams, teamMembers, notes, roles, permissionEntries] =
    await Promise.all([
      db.query.organization.findFirst({
        where: eq(organization.id, context.organizationId),
      }),
      db
        .select({
          id: member.id,
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt,
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(member)
        .innerJoin(user, eq(user.id, member.userId))
        .where(eq(member.organizationId, context.organizationId))
        .orderBy(asc(member.createdAt)),
      db
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          teamId: invitation.teamId,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
          inviterId: invitation.inviterId,
          inviterName: user.name,
        })
        .from(invitation)
        .innerJoin(user, eq(user.id, invitation.inviterId))
        .where(eq(invitation.organizationId, context.organizationId))
        .orderBy(asc(invitation.createdAt)),
      db
        .select({
          id: team.id,
          name: team.name,
          memberCount: team.memberCount,
          createdAt: team.createdAt,
        })
        .from(team)
        .where(eq(team.organizationId, context.organizationId))
        .orderBy(asc(team.createdAt)),
      db
        .select({
          id: teamMember.id,
          teamId: teamMember.teamId,
          userId: teamMember.userId,
          name: user.name,
          email: user.email,
        })
        .from(teamMember)
        .innerJoin(team, eq(team.id, teamMember.teamId))
        .innerJoin(user, eq(user.id, teamMember.userId))
        .where(eq(team.organizationId, context.organizationId)),
      db
        .select({ teamId: note.teamId })
        .from(note)
        .where(eq(note.organizationId, context.organizationId)),
      db
        .select({
          id: organizationRole.id,
          role: organizationRole.role,
          permission: organizationRole.permission,
          createdAt: organizationRole.createdAt,
          updatedAt: organizationRole.updatedAt,
        })
        .from(organizationRole)
        .where(eq(organizationRole.organizationId, context.organizationId))
        .orderBy(asc(organizationRole.role)),
      Promise.all(
        permissionChecks.map(async ([resource, action]) => [
          `${resource}.${action}`,
          await hasOrganizationPermission(
            context.organizationId,
            resource,
            action,
            context.requestHeaders,
          ),
        ] as const),
      ),
    ]);

  if (!organizationItem) {
    throw new Error("Active organization not found");
  }

  const ownerCount = members.filter((item) =>
    splitOrganizationRoles(item.role).includes("owner"),
  ).length;
  const pendingInvitations = invitations.filter((item) => item.status === "pending");

  return {
    currentUserId: context.session.user.id,
    emailVerified: context.session.user.emailVerified,
    activeTeamId: context.session.session.activeTeamId ?? null,
    membership: context.membership,
    permissions: Object.fromEntries(permissionEntries),
    organization: {
      ...organizationItem,
      metadata: parseMetadata(organizationItem.metadata),
    },
    members: members.map((item) => ({
      ...item,
      isLastOwner:
        ownerCount === 1 && splitOrganizationRoles(item.role).includes("owner"),
    })),
    invitations: invitations.map((item) => ({
      ...item,
      roles: splitOrganizationRoles(item.role),
    })),
    teams: teams.map((item) => ({
      ...item,
      noteCount: notes.filter((noteItem) => noteItem.teamId === item.id).length,
      members: teamMembers.filter((teamMemberItem) => teamMemberItem.teamId === item.id),
    })),
    roles: roles.map((item) => ({
      ...item,
      permission: parsePermission(item.permission),
      isAssigned: members.some((memberItem) =>
        splitOrganizationRoles(memberItem.role).includes(item.role),
      ),
      isInvited: pendingInvitations.some((invitationItem) =>
        splitOrganizationRoles(invitationItem.role).includes(item.role),
      ),
    })),
  };
}

export async function getPendingInvitationsForUser(email: string) {
  return db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      teamId: invitation.teamId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      inviterName: user.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .innerJoin(user, eq(user.id, invitation.inviterId))
    .where(
      and(eq(invitation.email, email.toLowerCase()), eq(invitation.status, "pending")),
    )
    .orderBy(asc(invitation.createdAt));
}
