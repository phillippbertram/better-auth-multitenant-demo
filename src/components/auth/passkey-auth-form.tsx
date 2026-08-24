"use client";

import { authClient } from "@/lib/auth-client";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getPasskeySupported() {
  return typeof PublicKeyCredential !== "undefined";
}

export function PasskeyAuthForm({ callbackPath }: { callbackPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passkeySupported = useSyncExternalStore(
    subscribe,
    getPasskeySupported,
    () => true,
  );

  async function handleContinue() {
    if (!passkeySupported) {
      setError("Passkeys are not supported in this browser.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await authClient.signIn.passkey();

      if (result.error) {
        setError(result.error.message ?? "Passkey sign-in failed.");
        return;
      }

      router.push(callbackPath);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Passkey sign-in failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="passkey-auth-form">
      <div className="passkey-auth-form__icon" aria-hidden="true">
        <SafetyCertificateOutlined />
      </div>

      <Typography.Paragraph type="secondary">
        Choose a passkey from this device, your password manager, or a nearby
        device.
      </Typography.Paragraph>

      {!passkeySupported && (
        <Alert
          type="warning"
          title="Passkeys not supported"
          description="Your browser does not support WebAuthn passkeys."
          showIcon
        />
      )}

      {error && (
        <Alert type="error" title={error} showIcon />
      )}

      <Button
        type="primary"
        block
        size="large"
        loading={loading}
        disabled={!passkeySupported}
        onClick={handleContinue}
      >
        Continue with passkey
      </Button>

      <Typography.Paragraph
        type="secondary"
        style={{ marginTop: 16, marginBottom: 0 }}
      >
        To add a passkey, sign in another way and open Account settings.
      </Typography.Paragraph>
    </div>
  );
}
