"use client";

import { formatCountdown } from "@/lib/auth-config";
import { Typography } from "antd";

type VerificationExpiryCountdownProps = {
  secondsLeft: number;
  expired: boolean;
  isRunning: boolean;
  label: string;
};

export function VerificationExpiryCountdown({
  secondsLeft,
  expired,
  isRunning,
  label,
}: VerificationExpiryCountdownProps) {
  if (!isRunning) {
    return null;
  }

  if (expired) {
    return (
      <Typography.Paragraph type="warning" style={{ marginTop: -8, marginBottom: 8 }}>
        {label} expired. Request a new one.
      </Typography.Paragraph>
    );
  }

  return (
    <Typography.Paragraph type="secondary" style={{ marginTop: -8, marginBottom: 8 }}>
      {label} expires in {formatCountdown(secondsLeft)}
    </Typography.Paragraph>
  );
}
