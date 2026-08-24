import { logDevelopmentAuthMessage } from "@/lib/log-development-auth-message";

type VerificationOtpType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

export async function sendVerificationOTP({
  email,
  otp,
  type,
}: {
  email: string;
  otp: string;
  type: VerificationOtpType;
}) {
  logDevelopmentAuthMessage(
    `[email-otp] type=${type} email=${email} otp=${otp}`,
  );
}
