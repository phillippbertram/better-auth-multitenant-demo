import {
  organizationAdminRole,
  organizationMemberRole,
  organizationOwnerRole,
  splitOrganizationRoles,
} from "@/lib/organization-access";
import {
  canAssignNoteTeam,
  canMutateNote,
  canReadNoteInContext,
  isNoteVisibleInTeamFilter,
} from "@/lib/note-policy";
import {
  canChangeOwnerMembership,
  canDeleteTeam,
  canMutateDynamicRole,
  canUseInvitation,
  hasPermissionAcrossRoles,
} from "@/lib/organization-policy";
import { isAdminRole } from "@/lib/roles";
import { describe, expect, it } from "vitest";

const memberPermissions = {
  read: true,
  create: true,
  update: true,
  delete: true,
  manage: false,
};

describe("organization note policy", () => {
  it("isolates notes by the active organization", () => {
    expect(canReadNoteInContext({ activeOrganizationId: "a", noteOrganizationId: "a", canRead: true })).toBe(true);
    expect(canReadNoteInContext({ activeOrganizationId: "a", noteOrganizationId: "b", canRead: true })).toBe(false);
  });

  it("allows members to edit their own note but requires manage for another author", () => {
    expect(canMutateNote({ action: "update", isAuthor: true, permissions: memberPermissions })).toBe(true);
    expect(canMutateNote({ action: "update", isAuthor: false, permissions: memberPermissions })).toBe(false);
    expect(canMutateNote({ action: "delete", isAuthor: false, permissions: { ...memberPermissions, manage: true } })).toBe(true);
  });

  it("uses the Platform admin override only when it is explicitly supplied", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(canMutateNote({ action: "delete", isAuthor: false, permissions: memberPermissions })).toBe(false);
    expect(canMutateNote({ action: "delete", isAuthor: false, permissions: memberPermissions, platformAdmin: true })).toBe(true);
  });

  it("uses teams as an organization-scoped filter instead of a security boundary", () => {
    expect(canAssignNoteTeam({ organizationId: "a", teamOrganizationId: null })).toBe(true);
    expect(canAssignNoteTeam({ organizationId: "a", teamOrganizationId: "a" })).toBe(true);
    expect(canAssignNoteTeam({ organizationId: "a", teamOrganizationId: "b" })).toBe(false);
    expect(isNoteVisibleInTeamFilter({ activeTeamId: null, noteTeamId: "product" })).toBe(true);
    expect(isNoteVisibleInTeamFilter({ activeTeamId: "product", noteTeamId: "product" })).toBe(true);
    expect(isNoteVisibleInTeamFilter({ activeTeamId: "product", noteTeamId: null })).toBe(false);
  });
});

describe("organization roles", () => {
  it("keeps default role capabilities separate", () => {
    expect(organizationOwnerRole.authorize({ organization: ["delete"], note: ["manage"] }).success).toBe(true);
    expect(organizationAdminRole.authorize({ organization: ["delete"] }).success).toBe(false);
    expect(organizationMemberRole.authorize({ note: ["manage"] }).success).toBe(false);
  });

  it("combines multiple standard and dynamic roles", () => {
    const matrices = {
      member: { note: ["read", "create"] },
      editor: { note: ["update", "manage"] },
    };
    expect(splitOrganizationRoles("member, editor")).toEqual(["member", "editor"]);
    expect(hasPermissionAcrossRoles("member,editor", matrices, "note", "manage")).toBe(true);
    expect(hasPermissionAcrossRoles("member", matrices, "note", "manage")).toBe(false);
  });

  it("protects the last owner and owner role transfers", () => {
    expect(canChangeOwnerMembership({ currentRole: "owner", nextRoles: ["member"], ownerCount: 1, updaterRoles: "owner" })).toBe(false);
    expect(canChangeOwnerMembership({ currentRole: "member", nextRoles: ["owner"], ownerCount: 1, updaterRoles: "admin" })).toBe(false);
    expect(canChangeOwnerMembership({ currentRole: "owner", nextRoles: ["member"], ownerCount: 2, updaterRoles: "owner" })).toBe(true);
  });

  it("protects assigned or invited dynamic roles", () => {
    expect(canMutateDynamicRole({ isAssigned: true, isUsedByPendingInvitation: false, hasPermission: true })).toBe(false);
    expect(canMutateDynamicRole({ isAssigned: false, isUsedByPendingInvitation: true, hasPermission: true })).toBe(false);
    expect(canMutateDynamicRole({ isAssigned: false, isUsedByPendingInvitation: false, hasPermission: true })).toBe(true);
  });
});

describe("organization guards", () => {
  it("protects the last and active team", () => {
    expect(canDeleteTeam({ teamCount: 1, teamId: "a", activeTeamId: null, hasPermission: true })).toBe(false);
    expect(canDeleteTeam({ teamCount: 2, teamId: "a", activeTeamId: "a", hasPermission: true })).toBe(false);
    expect(canDeleteTeam({ teamCount: 2, teamId: "b", activeTeamId: "a", hasPermission: true })).toBe(true);
  });

  it("requires a verified matching email for invitation actions", () => {
    expect(canUseInvitation({ currentEmail: "Sam@example.com", invitationEmail: "sam@example.com", emailVerified: true })).toBe(true);
    expect(canUseInvitation({ currentEmail: "sam@example.com", invitationEmail: "sam@example.com", emailVerified: false })).toBe(false);
    expect(canUseInvitation({ currentEmail: "alex@example.com", invitationEmail: "sam@example.com", emailVerified: true })).toBe(false);
  });
});
