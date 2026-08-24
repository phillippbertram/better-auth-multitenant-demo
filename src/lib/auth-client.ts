import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import {
  adminClient,
  emailOTPClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import {
  organizationAccessControl,
  organizationRoles,
} from "@/lib/organization-access";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    emailOTPClient(),
    magicLinkClient(),
    organizationClient({
      ac: organizationAccessControl,
      roles: organizationRoles,
      teams: { enabled: true },
      dynamicAccessControl: { enabled: true },
    }),
    passkeyClient(),
  ],
});
