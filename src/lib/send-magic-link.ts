import { logDevelopmentAuthMessage } from "@/lib/log-development-auth-message";

export async function sendMagicLink({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  logDevelopmentAuthMessage(`[magic-link] email=${email} url=${url}`);
}
