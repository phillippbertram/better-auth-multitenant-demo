"use client";

import { VerificationExpiryCountdown } from "@/components/auth/verification-expiry-countdown";
import { useCountdown } from "@/hooks/use-countdown";
import { authClient } from "@/lib/auth-client";
import {
  AUTH_EMAIL_OTP_EXPIRES_IN_SECONDS,
  AUTH_VERIFICATION_RESEND_COOLDOWN_SECONDS,
} from "@/lib/auth-config";
import { Alert, Button, Form, Input, Space, Typography } from "antd";
import { MailOutlined, UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AuthMode = "sign-in" | "sign-up";

type EmailOtpFormProps = {
  mode: AuthMode;
  callbackPath: string;
};

type EmailOtpFormValues = {
  name?: string;
  email: string;
  otp?: string;
};

export function EmailOtpForm({ mode, callbackPath }: EmailOtpFormProps) {
  const router = useRouter();
  const [form] = Form.useForm<EmailOtpFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState("");
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

  async function sendCode(email: string) {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    if (result.error) {
      throw new Error(result.error.message ?? "Could not send verification code.");
    }

    setCodeSent(true);
    setResendIn(AUTH_VERIFICATION_RESEND_COOLDOWN_SECONDS);
    expiryCountdown.start(AUTH_EMAIL_OTP_EXPIRES_IN_SECONDS);
  }

  async function handleSendCode() {
    setError(null);
    setLoading(true);

    try {
      const email = form.getFieldValue("email") as string | undefined;

      if (!email) {
        await form.validateFields(["email"]);
        return;
      }

      if (mode === "sign-up") {
        await form.validateFields(["name"]);
      }

      await sendCode(email);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not send verification code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (expiryCountdown.expired) {
      setError("Verification code expired. Request a new code.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const values = await form.validateFields();

      if (otp.length !== 6) {
        setError("Please enter the 6-digit code.");
        return;
      }

      const result = await authClient.signIn.emailOtp({
        email: values.email,
        otp,
        name: mode === "sign-up" ? values.name : undefined,
      });

      if (result.error) {
        setError(result.error.message ?? "Verification failed.");
        return;
      }

      router.push(callbackPath);
      router.refresh();
    } catch (caught) {
      if (caught instanceof Error && caught.message) {
        setError(caught.message);
        return;
      }

      setError("Verification failed.");
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
      const email = form.getFieldValue("email") as string;
      await sendCode(email);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not resend verification code.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form<EmailOtpFormValues>
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
            disabled={codeSent}
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
          disabled={codeSent}
          prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
        />
      </Form.Item>

      {codeSent && (
        <>
          <Form.Item label="Verification code">
            <Input.OTP
              length={6}
              value={otp}
              onChange={setOtp}
              disabled={expiryCountdown.expired}
            />
          </Form.Item>

          <VerificationExpiryCountdown
            secondsLeft={expiryCountdown.secondsLeft}
            expired={expiryCountdown.expired}
            isRunning={expiryCountdown.isRunning}
            label="Code"
          />

          <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
            In development, check the server terminal for your code.
          </Typography.Paragraph>
        </>
      )}

      {error && (
        <Form.Item>
          <Alert type="error" title={error} showIcon />
        </Form.Item>
      )}

      <Form.Item style={{ marginBottom: 0 }}>
        {!codeSent ? (
          <Button type="primary" block loading={loading} onClick={handleSendCode} size="large">
            Send code
          </Button>
        ) : (
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Button
              type="primary"
              block
              size="large"
              loading={loading}
              disabled={expiryCountdown.expired}
              onClick={handleVerify}
            >
              Verify and continue
            </Button>
            <Button block size="large" disabled={resendIn > 0 || loading} onClick={handleResend}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </Button>
          </Space>
        )}
      </Form.Item>
    </Form>
  );
}
