import { closeDatabaseConnection, db } from "@/db";
import {
  account as accountTable,
  invitation,
  member,
  organization,
  organizationRole,
  session,
  team,
  teamMember,
  user as userTable,
} from "@/db/auth-schema";
import * as authSchema from "@/db/auth-schema";
import { note } from "@/db/note-schema";
import { env } from "@/env";
import { AUTH_EMAIL_AND_PASSWORD_OPTIONS } from "@/lib/auth-config";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  type DemoSeedAccount,
} from "@/lib/demo-accounts";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { and, eq, inArray } from "drizzle-orm";

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const DEMO_ORGANIZATION_IDS = ["demo-org-acme", "demo-org-launch"] as const;

const seedAuth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: AUTH_EMAIL_AND_PASSWORD_OPTIONS,
  plugins: [admin()],
});

function assertDemoSeedIsAllowed() {
  const databaseHost = new URL(env.DATABASE_URL).hostname;

  if (!LOCAL_DATABASE_HOSTS.has(databaseHost) && !env.DEMO_SEED_ALLOW_REMOTE) {
    throw new Error(
      `Refusing to seed the non-local database host "${databaseHost}". ` +
        "Set DEMO_SEED_ALLOW_REMOTE=true only when known demo credentials are intentional.",
    );
  }
}

async function findUserByEmail(email: string) {
  return db.query.user.findFirst({ where: eq(userTable.email, email) });
}

async function seedAccount(seedAccount: DemoSeedAccount) {
  let demoUser = await findUserByEmail(seedAccount.email);
  let created = false;

  if (!demoUser) {
    await seedAuth.api.createUser({
      body: {
        name: seedAccount.name,
        email: seedAccount.email,
        password: seedAccount.password,
        role: seedAccount.role,
        data: { emailVerified: true },
      },
    });
    demoUser = await findUserByEmail(seedAccount.email);
    created = true;
  }

  if (!demoUser) {
    throw new Error(`Could not create demo user ${seedAccount.email}.`);
  }

  const credentialAccount = await db.query.account.findFirst({
    where: and(
      eq(accountTable.userId, demoUser.id),
      eq(accountTable.providerId, "credential"),
    ),
  });

  if (!credentialAccount) {
    throw new Error(`The existing user ${seedAccount.email} has no password credential.`);
  }

  const authContext = await seedAuth.$context;
  const hashedPassword = await authContext.password.hash(seedAccount.password);
  const now = new Date();

  await db
    .update(userTable)
    .set({
      name: seedAccount.name,
      role: seedAccount.role,
      emailVerified: true,
      banned: false,
      banReason: null,
      banExpires: null,
      updatedAt: now,
    })
    .where(eq(userTable.id, demoUser.id));

  await db
    .update(accountTable)
    .set({ password: hashedPassword, updatedAt: now })
    .where(eq(accountTable.id, credentialAccount.id));

  console.log(
    `${created ? "Created" : "Updated"} ${seedAccount.role.padEnd(5)} ${seedAccount.email}`,
  );

  return demoUser;
}

async function seedOrganizationScenario(users: Record<string, string>) {
  const createdAt = new Date("2026-01-01T10:00:00.000Z");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx
      .update(session)
      .set({ activeOrganizationId: null, activeTeamId: null })
      .where(inArray(session.userId, [users.admin, users.alex, users.sam]));
    await tx.delete(organization).where(inArray(organization.id, [...DEMO_ORGANIZATION_IDS]));

    await tx.insert(organization).values([
      {
        id: "demo-org-acme",
        name: "Acme Studio",
        slug: "acme-studio",
        logo: "https://api.dicebear.com/9.x/shapes/svg?seed=Acme",
        metadata: JSON.stringify({ industry: "Product design", plan: "Demo" }),
        createdAt,
      },
      {
        id: "demo-org-launch",
        name: "Launch Lab",
        slug: "launch-lab",
        logo: "https://api.dicebear.com/9.x/shapes/svg?seed=Launch",
        metadata: JSON.stringify({ industry: "Research", plan: "Demo" }),
        createdAt: new Date(createdAt.getTime() + 1_000),
      },
    ]);

    await tx.insert(member).values([
      { id: "demo-member-acme-alex", organizationId: "demo-org-acme", userId: users.alex, role: "owner", createdAt },
      { id: "demo-member-acme-sam", organizationId: "demo-org-acme", userId: users.sam, role: "member,editor", createdAt },
      { id: "demo-member-launch-alex", organizationId: "demo-org-launch", userId: users.alex, role: "owner", createdAt: new Date(createdAt.getTime() + 1_000) },
    ]);

    await tx.insert(team).values([
      { id: "demo-team-acme-general", name: "Product", memberCount: 2, organizationId: "demo-org-acme", createdAt },
      { id: "demo-team-acme-product", name: "Marketing", memberCount: 2, organizationId: "demo-org-acme", createdAt: new Date(createdAt.getTime() + 1_000) },
      { id: "demo-team-acme-operations", name: "Operations", memberCount: 1, organizationId: "demo-org-acme", createdAt: new Date(createdAt.getTime() + 2_000) },
      { id: "demo-team-launch-general", name: "Research", memberCount: 1, organizationId: "demo-org-launch", createdAt },
      { id: "demo-team-launch-research", name: "Go-to-market", memberCount: 1, organizationId: "demo-org-launch", createdAt: new Date(createdAt.getTime() + 1_000) },
    ]);

    const teamMemberships = [
      ["acme-general-alex", "demo-team-acme-general", users.alex],
      ["acme-general-sam", "demo-team-acme-general", users.sam],
      ["acme-product-alex", "demo-team-acme-product", users.alex],
      ["acme-product-sam", "demo-team-acme-product", users.sam],
      ["acme-operations-sam", "demo-team-acme-operations", users.sam],
      ["launch-general-alex", "demo-team-launch-general", users.alex],
      ["launch-research-alex", "demo-team-launch-research", users.alex],
    ] as const;

    await tx.insert(teamMember).values(
      teamMemberships.map(([id, teamId, userId]) => ({
        id: `demo-team-member-${id}`,
        teamId,
        userId,
        membershipKey: `${teamId}:${userId}`,
        createdAt,
      })),
    );

    const emptyOrganizationPermissions = {
      organization: [], member: [], invitation: [], team: [], ac: [],
    };

    await tx.insert(organizationRole).values([
      {
        id: "demo-role-acme-editor",
        organizationId: "demo-org-acme",
        role: "editor",
        permission: JSON.stringify({
          ...emptyOrganizationPermissions,
          note: ["read", "create", "update", "delete", "manage"],
        }),
        createdAt,
      },
      {
        id: "demo-role-launch-reviewer",
        organizationId: "demo-org-launch",
        role: "reviewer",
        permission: JSON.stringify({
          ...emptyOrganizationPermissions,
          note: ["read"],
        }),
        createdAt,
      },
    ]);

    await tx.insert(invitation).values({
      id: "demo-invitation-launch-sam",
      organizationId: "demo-org-launch",
      email: "sam@example.com",
      role: "member,reviewer",
      teamId: "demo-team-launch-general",
      status: "pending",
      expiresAt,
      createdAt,
      inviterId: users.alex,
    });

    await tx.insert(note).values([
      {
        id: "demo-note-acme-roadmap",
        organizationId: "demo-org-acme",
        teamId: "demo-team-acme-general",
        authorId: users.alex,
        title: "Acme roadmap",
        content: "Review organization settings, member roles, teams, and shared note permissions.",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-note-acme-launch-copy",
        organizationId: "demo-org-acme",
        teamId: "demo-team-acme-product",
        authorId: users.alex,
        title: "Launch copy",
        content: "Alex authored this note. Organization owners and editors with manage can update it.",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-note-acme-review",
        organizationId: "demo-org-acme",
        teamId: "demo-team-acme-operations",
        authorId: users.sam,
        title: "Editorial review",
        content: "Sam combines the member and editor roles in Acme Studio.",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-note-launch-experiment",
        organizationId: "demo-org-launch",
        teamId: "demo-team-launch-general",
        authorId: users.alex,
        title: "Launch experiment",
        content: "This note is isolated from Acme Studio even though Alex belongs to both organizations.",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-note-acme-handbook",
        organizationId: "demo-org-acme",
        teamId: null,
        authorId: users.alex,
        title: "Studio handbook",
        content: "An organization-wide note that appears only in the complete organization view.",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-note-launch-checklist",
        organizationId: "demo-org-launch",
        teamId: "demo-team-launch-research",
        authorId: users.alex,
        title: "Go-to-market checklist",
        content: "A focused team note for launch messaging, channels, and release readiness.",
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    await tx
      .update(session)
      .set({
        activeOrganizationId: "demo-org-acme",
        activeTeamId: "demo-team-acme-general",
      })
      .where(inArray(session.userId, [users.alex, users.sam]));
  });
}

async function main() {
  assertDemoSeedIsAllowed();
  console.log("Seeding predefined demo accounts and organization scenarios...\n");

  const users: Record<string, string> = {};
  for (const demoAccount of DEMO_ACCOUNTS) {
    const user = await seedAccount(demoAccount);
    users[demoAccount.key] = user.id;
  }

  if (!users.admin || !users.alex || !users.sam) {
    throw new Error("Could not resolve all demo users.");
  }

  await seedOrganizationScenario(users);

  console.log("\nDemo organizations, teams, roles, invitations, and notes are ready.");
  console.log(`Shared password: ${DEMO_PASSWORD}`);
  console.log("Set DEMO_MODE=true to show one-click login options on the home page.");
}

async function run() {
  try {
    await main();
  } finally {
    await closeDatabaseConnection();
  }
}

void run().catch((error) => {
  console.error("\nDemo seed failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
