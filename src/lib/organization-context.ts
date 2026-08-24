import { db } from "@/db";
import { member, team, teamMember, user } from "@/db/auth-schema";
import { and, asc, eq } from "drizzle-orm";
import { isAdminRole } from "@/lib/roles";

export type ActiveOrganizationContext = {
  organizationId: string | null;
  teamId: string | null;
};

export async function getInitialOrganizationContext(
  userId: string,
): Promise<ActiveOrganizationContext> {
  const account = await db.query.user.findFirst({
    columns: { role: true },
    where: eq(user.id, userId),
  });

  if (isAdminRole(account?.role)) {
    return { organizationId: null, teamId: null };
  }

  const [membership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))
    .limit(1);

  if (!membership) {
    return { organizationId: null, teamId: null };
  }

  const [firstTeam] = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .innerJoin(team, eq(team.id, teamMember.teamId))
    .where(
      and(
        eq(teamMember.userId, userId),
        eq(team.organizationId, membership.organizationId),
      ),
    )
    .orderBy(asc(team.createdAt))
    .limit(1);

  return {
    organizationId: membership.organizationId,
    teamId: firstTeam?.teamId ?? null,
  };
}
