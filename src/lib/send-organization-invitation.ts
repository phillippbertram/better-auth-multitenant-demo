import { env } from "@/env";
import { logDevelopmentAuthMessage } from "@/lib/log-development-auth-message";

type OrganizationInvitationData = {
  id: string;
  email: string;
  organization: {
    name: string;
  };
  inviter: {
    user: {
      name: string;
      email: string;
    };
  };
};

export async function sendOrganizationInvitation({
  id,
  email,
  organization,
  inviter,
}: OrganizationInvitationData) {
  const invitationUrl = new URL(`/invitations/${id}`, env.BETTER_AUTH_URL);

  logDevelopmentAuthMessage(
    `[organization-invitation] email=${email} organization=${JSON.stringify(organization.name)} inviter=${JSON.stringify(inviter.user.email)} url=${invitationUrl.toString()}`,
  );
}
