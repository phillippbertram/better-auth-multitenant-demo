import { env } from "@/env";
import { db } from "@/db";
import * as authSchema from "@/db/auth-schema";
import { getAuthenticatorName, passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sendMagicLink } from "@/lib/send-magic-link";
import { sendVerificationEmail } from "@/lib/send-verification-email";
import { sendVerificationOTP } from "@/lib/send-verification-otp";
import {
  AUTH_EMAIL_AND_PASSWORD_OPTIONS,
  AUTH_EMAIL_OTP_EXPIRES_IN_SECONDS,
  AUTH_MAGIC_LINK_EXPIRES_IN_SECONDS,
} from "@/lib/auth-config";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP, magicLink, organization } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import {
  ORGANIZATION_LIMITS,
  organizationAccessControl,
  organizationRoles,
} from "@/lib/organization-access";
import { sendOrganizationInvitation } from "@/lib/send-organization-invitation";
import { getInitialOrganizationContext } from "@/lib/organization-context";
import { eq } from "drizzle-orm";
import { isAdminRole } from "@/lib/roles";

const authUrl = new URL(env.BETTER_AUTH_URL);

export const auth = betterAuth({
  baseURL: authUrl.origin,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins:
    process.env.NODE_ENV === "development"
      ? ["http://localhost:*", "http://127.0.0.1:*"]
      : [],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: AUTH_EMAIL_AND_PASSWORD_OPTIONS,
  user: {
    changeEmail: {
      enabled: true,
    },
  },
  emailVerification: {
    sendVerificationEmail,
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const context = await getInitialOrganizationContext(session.userId);

          return {
            data: {
              ...session,
              activeOrganizationId: context.organizationId,
              activeTeamId: context.teamId,
            },
          };
        },
      },
    },
  },
  plugins: [
    admin(),
    emailOTP({
      sendVerificationOTP,
      expiresIn: AUTH_EMAIL_OTP_EXPIRES_IN_SECONDS,
    }),
    magicLink({
      sendMagicLink,
      expiresIn: AUTH_MAGIC_LINK_EXPIRES_IN_SECONDS,
    }),
    organization({
      allowUserToCreateOrganization: (user) => !isAdminRole(user.role),
      organizationLimit: ORGANIZATION_LIMITS.organizationsPerUser,
      membershipLimit: ORGANIZATION_LIMITS.membersPerOrganization,
      invitationLimit: ORGANIZATION_LIMITS.pendingInvitations,
      invitationExpiresIn: ORGANIZATION_LIMITS.invitationExpiresInSeconds,
      cancelPendingInvitationsOnReInvite: true,
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: sendOrganizationInvitation,
      ac: organizationAccessControl,
      roles: organizationRoles,
      dynamicAccessControl: {
        enabled: true,
        maximumRolesPerOrganization:
          ORGANIZATION_LIMITS.dynamicRolesPerOrganization,
      },
      teams: {
        enabled: true,
        defaultTeam: { enabled: true },
        maximumTeams: ORGANIZATION_LIMITS.teamsPerOrganization,
        maximumMembersPerTeam: ORGANIZATION_LIMITS.membersPerTeam,
        allowRemovingAllTeams: false,
      },
      organizationHooks: {
        beforeCreateInvitation: async ({ invitation }) => {
          if (process.env.NODE_ENV === "production") {
            throw new APIError("SERVICE_UNAVAILABLE", {
              message:
                "Organization invitations require an email provider in production.",
            });
          }

          const recipient = await db.query.user.findFirst({
            columns: { role: true },
            where: eq(authSchema.user.email, invitation.email.toLowerCase()),
          });

          if (isAdminRole(recipient?.role)) {
            throw new APIError("BAD_REQUEST", {
              message:
                "Platform admins use the global workspace and cannot join organizations.",
            });
          }
        },
        beforeAcceptInvitation: async ({ user }) => {
          if (isAdminRole(user.role)) {
            throw new APIError("BAD_REQUEST", {
              message:
                "Platform admins use the global workspace and cannot join organizations.",
            });
          }
        },
        beforeDeleteTeam: async ({ team }) => {
          const activeSessions = await db
            .select({ id: authSchema.session.id })
            .from(authSchema.session)
            .where(eq(authSchema.session.activeTeamId, team.id))
            .limit(1);

          if (activeSessions.length > 0) {
            throw new APIError("BAD_REQUEST", {
              message:
                "An active team cannot be deleted. Activate another team first.",
            });
          }
        },
      },
    }),
    passkey({
      rpID: authUrl.hostname,
      rpName: "Better Auth Organizations Demo",
      origin: authUrl.origin,
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
      registration: {
        afterVerification: async ({ verification }) => ({
          name: getAuthenticatorName(verification.registrationInfo?.aaguid),
        }),
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
