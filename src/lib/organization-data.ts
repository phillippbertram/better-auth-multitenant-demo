import { db } from "@/db";
import { member, organization, team, teamMember } from "@/db/auth-schema";
import { and, asc, eq, inArray } from "drizzle-orm";

export type OrganizationShellItem = {
  id: string;
  name: string;
  slug: string;
  role: string;
  teams: { id: string; name: string }[];
};

export async function getOrganizationShellItems(userId: string) {
  const memberships = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt));

  if (memberships.length === 0) {
    return [];
  }

  const organizationIds = memberships.map((item) => item.id);
  const membershipsByTeam = await db
    .select({
      id: team.id,
      name: team.name,
      organizationId: team.organizationId,
    })
    .from(teamMember)
    .innerJoin(team, eq(team.id, teamMember.teamId))
    .where(
      and(
        eq(teamMember.userId, userId),
        inArray(team.organizationId, organizationIds),
      ),
    )
    .orderBy(asc(team.createdAt));

  return memberships.map<OrganizationShellItem>((item) => ({
    ...item,
    teams: membershipsByTeam
      .filter((teamItem) => teamItem.organizationId === item.id)
      .map(({ id, name }) => ({ id, name })),
  }));
}
