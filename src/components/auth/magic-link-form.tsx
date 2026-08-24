"use client";

import { VerificationExpiryCountdown } from "@/components/auth/verification-expiry-countdown";
import { useCountdown } from "@/hooks/use-countdown";
import { authClient } from "@/lib/auth-client";
import {
  AUTH_MAGIC_LINK_EXPIRES_IN_SECONDS,
  AUTH_VERIFICATION_RESEND_COOLDOWN_SECONDS,
} from "@/lib/auth-config";
import { Alert, Button, Form, Input, Space, Typography } from "antd";
import { MailOutlined, UserOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";

type AuthMode = "sign-in" | "sign-up";

type MagicLinkFormProps = {
  mode: AuthMode;
  callbackPath: string;
};

type MagicLinkFormValues = {
  name?: string;
  email: string;
};

export function MagicLinkForm({ mode, callbackPath }: MagicLinkFormProps) {
  const [form] = Form.useForm<MagicLinkFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const expiryCountdown = useCountdown();

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendIn((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function sendLink(email: string, name?: string) {
    const result = await authClient.signIn.magicLink({
      email,
      name: mode === "sign-up" ? name : undefined,
      callbackURL: callbackPath,
      errorCallbackURL: `/?next=${encodeURIComponent(callbackPath)}`,
    });

    if (result.error) {
      throw new Error(result.error.message ?? "Could not send magic link.");
    }

    setLinkSent(true);
    setResendIn(AUTH_VERIFICATION_RESEND_COOLDOWN_SECONDS);
    expiryCountdown.start(AUTH_MAGIC_LINK_EXPIRES_IN_SECONDS);
  }

  async function handleSendLink() {
    setError(null);
    setLoading(true);

    try {
      const values = await form.validateFields();
      await sendLink(values.email, values.name);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not send magic link.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const values = await form.validateFields();
      await sendLink(values.email, values.name);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not resend magic link.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form<MagicLinkFormValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      size="large"
    >
      {mode === "sign-up" && (
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Please enter your name." }]}
        >
          <Input
            placeholder="Jane Doe"
            disabled={linkSent}
            prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
          />
        </Form.Item>
      )}

      <Form.Item
        label="Email"
        name="email"
        rules={[
          { required: true, message: "Please enter your email." },
          { type: "email", message: "Please enter a valid email." },
        ]}
      >
        <Input
          placeholder="jane@example.com"
          disabled={linkSent}
          prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
        />
      </Form.Item>

      {linkSent && (
        <>
          <VerificationExpiryCountdown
            secondsLeft={expiryCountdown.secondsLeft}
            expired={expiryCountdown.expired}
            isRunning={expiryCountdown.isRunning}
            label="Link"
          />

          <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
            Check your email for the sign-in link. In development, copy the URL
            from the server terminal where <code>pnpm dev</code> is running.
          </Typography.Paragraph>
        </>
      )}

      {error && (
        <Form.Item>
          <Alert type="error" title={error} showIcon />
        </Form.Item>
      )}

      <Form.Item style={{ marginBottom: 0 }}>
        {!linkSent ? (
          <Button type="primary" block size="large" loading={loading} onClick={handleSendLink}>
            Send magic link
          </Button>
        ) : (
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Button block size="large" disabled={resendIn > 0 || loading} onClick={handleResend}>
              {resendIn > 0 ? `Resend link in ${resendIn}s` : "Resend link"}
            </Button>
          </Space>
        )}
      </Form.Item>
    </Form>
  );
}
