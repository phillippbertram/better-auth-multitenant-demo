import { db } from "@/db";
import { member, organization } from "@/db/auth-schema";
import { auth } from "@/lib/auth";
import type { NotePermission } from "@/lib/organization-access";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function requireOrganizationSession() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const organizationId = session.session.activeOrganizationId;

  if (!organizationId) {
    throw new Error("No active organization");
  }

  const [activeMembership] = await db
    .select({
      id: member.id,
      role: member.role,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!activeMembership) {
    throw new Error("Active organization membership not found");
  }

  return {
    session,
    requestHeaders,
    membership: activeMembership,
    organizationId,
  };
}

export async function hasOrganizationPermission(
  organizationId: string,
  resource: "organization" | "member" | "invitation" | "team" | "ac" | "note",
  action: string,
  requestHeaders: Headers,
) {
  const result = await auth.api.hasPermission({
    body: {
      organizationId,
      permissions: { [resource]: [action] },
    },
    headers: requestHeaders,
  });

  return result.success;
}

export async function getNotePermissions(
  organizationId: string,
  requestHeaders: Headers,
) {
  const entries = await Promise.all(
    (["read", "create", "update", "delete", "manage"] as const).map(
      async (permission) => [
        permission,
        await hasOrganizationPermission(
          organizationId,
          "note",
          permission,
          requestHeaders,
        ),
      ] as const,
    ),
  );

  return Object.fromEntries(entries) as Record<NotePermission, boolean>;
}
