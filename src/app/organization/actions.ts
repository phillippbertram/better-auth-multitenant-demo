"use server";

import { db } from "@/db";
import { invitation, member, organizationRole } from "@/db/auth-schema";
import { auth } from "@/lib/auth";
import { organizationStatements, splitOrganizationRoles } from "@/lib/organization-access";
import { requireOrganizationSession } from "@/lib/organization-session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canMutateDynamicRole } from "@/lib/organization-policy";

type RoleActionState = { success?: boolean; error?: string };

const roleNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_-]*$/, "Use lowercase letters, numbers, underscores, and hyphens.")
  .refine((value) => !["owner", "admin", "member"].includes(value), "Default role names are reserved.");

function sanitizePermissions(input: Record<string, string[]>) {
  return Object.fromEntries(
    Object.entries(organizationStatements).map(([resource, allowed]) => [
      resource,
      Array.isArray(input[resource])
        ? input[resource].filter((permission) =>
            (allowed as readonly string[]).includes(permission),
          )
        : [],
    ]),
  );
}

async function isRoleInUse(organizationId: string, roleName: string) {
  const [members, invitations] = await Promise.all([
    db
      .select({ role: member.role })
      .from(member)
      .where(eq(member.organizationId, organizationId)),
    db
      .select({ role: invitation.role })
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, organizationId),
          eq(invitation.status, "pending"),
        ),
      ),
  ]);

  return [...members, ...invitations].some((item) =>
    splitOrganizationRoles(item.role).includes(roleName),
  );
}

function revalidateRoles() {
  revalidatePath("/organization/roles");
  revalidatePath("/organization/members");
}

export async function createDynamicRole(
  roleName: string,
  permissions: Record<string, string[]>,
): Promise<RoleActionState> {
  try {
    const context = await requireOrganizationSession();
    const parsedRole = roleNameSchema.safeParse(roleName);
    if (!parsedRole.success) {
      return { error: parsedRole.error.issues[0]?.message ?? "Invalid role name." };
    }

    await auth.api.createOrgRole({
      body: {
        organizationId: context.organizationId,
        role: parsedRole.data,
        permission: sanitizePermissions(permissions),
      },
      headers: context.requestHeaders,
    });
    revalidateRoles();
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the role." };
  }
}

export async function updateDynamicRole(
  roleId: string,
  originalRoleName: string,
  roleName: string,
  permissions: Record<string, string[]>,
): Promise<RoleActionState> {
  try {
    const context = await requireOrganizationSession();
    const parsedRole = roleNameSchema.safeParse(roleName);
    if (!parsedRole.success) {
      return { error: parsedRole.error.issues[0]?.message ?? "Invalid role name." };
    }

    const [target] = await db
      .select({ id: organizationRole.id, role: organizationRole.role })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.id, roleId),
          eq(organizationRole.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    if (!target || target.role !== originalRoleName) return { error: "Role not found." };

    const isRenaming = parsedRole.data !== originalRoleName;
    if (
      isRenaming &&
      !canMutateDynamicRole({
        isAssigned: await isRoleInUse(context.organizationId, originalRoleName),
        isUsedByPendingInvitation: false,
        hasPermission: true,
      })
    ) {
      return { error: "Assigned roles and roles used by pending invitations cannot be renamed." };
    }

    await auth.api.updateOrgRole({
      body: {
        organizationId: context.organizationId,
        roleId,
        data: {
          ...(isRenaming ? { roleName: parsedRole.data } : {}),
          permission: sanitizePermissions(permissions),
        },
      },
      headers: context.requestHeaders,
    });
    revalidateRoles();
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update the role." };
  }
}

export async function deleteDynamicRole(
  roleId: string,
  roleName: string,
): Promise<RoleActionState> {
  try {
    const context = await requireOrganizationSession();
    const [target] = await db
      .select({ id: organizationRole.id, role: organizationRole.role })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.id, roleId),
          eq(organizationRole.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    if (!target || target.role !== roleName) return { error: "Role not found." };
    if (
      !canMutateDynamicRole({
        isAssigned: await isRoleInUse(context.organizationId, roleName),
        isUsedByPendingInvitation: false,
        hasPermission: true,
      })
    ) {
      return { error: "Assigned roles and roles used by pending invitations cannot be deleted." };
    }

    await auth.api.deleteOrgRole({
      body: { organizationId: context.organizationId, roleId },
      headers: context.requestHeaders,
    });
    revalidateRoles();
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete the role." };
  }
}
