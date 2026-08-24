export const AUTH_EMAIL_OTP_EXPIRES_IN_SECONDS = 300;
export const AUTH_MAGIC_LINK_EXPIRES_IN_SECONDS = 300;
export const AUTH_VERIFICATION_RESEND_COOLDOWN_SECONDS = 30;
export const AUTH_EMAIL_AND_PASSWORD_OPTIONS = { enabled: true } as const;

export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
