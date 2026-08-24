import { logDevelopmentAuthMessage } from "@/lib/log-development-auth-message";

export async function sendVerificationEmail({
  user,
  url,
}: {
  user: { email: string };
  url: string;
  token: string;
}) {
  logDevelopmentAuthMessage(
    `[email-verification] email=${user.email} url=${url}`,
  );
}
