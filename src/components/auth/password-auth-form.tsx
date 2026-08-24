"use client";

import { VerificationExpiryCountdown } from "@/components/auth/verification-expiry-countdown";
import { useCountdown } from "@/hooks/use-countdown";
import { authClient } from "@/lib/auth-client";
import { AUTH_EMAIL_OTP_EXPIRES_IN_SECONDS } from "@/lib/auth-config";
import type { DemoLoginAccount } from "@/lib/demo-accounts";
import { Alert, Button, Form, Input, Modal, Typography } from "antd";
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthMode = "sign-in" | "sign-up";

type PasswordAuthFormProps = {
  mode: AuthMode;
  demoAccounts?: readonly DemoLoginAccount[];
  callbackPath: string;
};

type PasswordFormValues = {
  name?: string;
  email: string;
  password: string;
};

type ResetFormValues = {
  email: string;
  otp: string;
  password: string;
};

type ResetPasswordModalProps = {
  onClose: () => void;
  onSuccess: (email: string, password: string) => void;
};

function ResetPasswordModal({ onClose, onSuccess }: ResetPasswordModalProps) {
  const [form] = Form.useForm<ResetFormValues>();
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const expiryCountdown = useCountdown();

  async function handleSendResetOtp() {
    setResetError(null);

    try {
      const email = form.getFieldValue("email") as string | undefined;

      if (!email) {
        await form.validateFields(["email"]);
        return;
      }

      setResetLoading(true);

      const result = await authClient.emailOtp.requestPasswordReset({
        email,
      });

      if (result.error) {
        setResetError(result.error.message ?? "Could not send reset code.");
        return;
      }

      setResetStep("confirm");
      expiryCountdown.start(AUTH_EMAIL_OTP_EXPIRES_IN_SECONDS);
    } catch {
      setResetError("Could not send reset code.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResetPassword(values: ResetFormValues) {
    if (expiryCountdown.expired) {
      setResetError("Reset code expired. Request a new code.");
      return;
    }

    setResetError(null);
    setResetLoading(true);

    try {
      const result = await authClient.emailOtp.resetPassword({
        email: values.email,
        otp: values.otp,
        password: values.password,
      });

      if (result.error) {
        setResetError(result.error.message ?? "Could not reset password.");
        return;
      }

      onSuccess(values.email, values.password);
    } catch {
      setResetError("Could not reset password.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <Modal title="Reset password" open onCancel={onClose} footer={null} destroyOnHidden>
      <Form<ResetFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleResetPassword}
      >
        <Typography.Paragraph type="secondary">
          In development, check the server terminal for your reset code.
        </Typography.Paragraph>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Please enter your email." },
            { type: "email", message: "Please enter a valid email." },
          ]}
        >
          <Input placeholder="jane@example.com" disabled={resetStep === "confirm"} />
        </Form.Item>

        {resetStep === "confirm" && (
          <>
            <VerificationExpiryCountdown
              secondsLeft={expiryCountdown.secondsLeft}
              expired={expiryCountdown.expired}
              isRunning={expiryCountdown.isRunning}
              label="Code"
            />

            <Form.Item
              label="Reset code"
              name="otp"
              rules={[{ required: true, message: "Please enter the code." }]}
            >
              <Input
                placeholder="6-digit code"
                maxLength={6}
                disabled={expiryCountdown.expired}
              />
            </Form.Item>

            <Form.Item
              label="New password"
              name="password"
              rules={[
                { required: true, message: "Please enter a new password." },
                { min: 8, message: "Must be at least 8 characters." },
              ]}
            >
              <Input.Password placeholder="At least 8 characters" />
            </Form.Item>
          </>
        )}

        {resetError && (
          <Form.Item>
            <Alert type="error" title={resetError} showIcon />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          {resetStep === "request" ? (
            <Button
              type="primary"
              block
              loading={resetLoading}
              onClick={handleSendResetOtp}
            >
              Send reset code
            </Button>
          ) : (
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={resetLoading}
              disabled={expiryCountdown.expired}
            >
              Reset password
            </Button>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function PasswordAuthForm({ mode, demoAccounts, callbackPath }: PasswordAuthFormProps) {
  const router = useRouter();
  const [form] = Form.useForm<PasswordFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function handleSubmit(values: PasswordFormValues) {
    setError(null);
    setLoading(true);

    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          name: values.name ?? "",
          email: values.email,
          password: values.password,
        });

        if (result.error) {
          setError(result.error.message ?? "Sign-up failed.");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email: values.email,
          password: values.password,
        });

        if (result.error) {
          setError(result.error.message ?? "Sign-in failed.");
          return;
        }
      }

      router.push(callbackPath);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function handleDemoSignIn(account: DemoLoginAccount) {
    setError(null);
    form.setFieldsValue({
      email: account.email,
      password: account.password,
    });
    form.submit();
  }

  return (
    <>
      <Form<PasswordFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        size="large"
        onFinish={handleSubmit}
      >
        {mode === "sign-in" && demoAccounts && demoAccounts.length > 0 && (
          <div className="demo-login">
            <div className="demo-login__heading">
              <span>Demo accounts</span>
              <span className="demo-login__hint">One-click sign-in</span>
            </div>
            <div className="demo-login__accounts">
              {demoAccounts.map((account) => (
                <button
                  key={account.key}
                  type="button"
                  className="demo-login__account"
                  disabled={loading}
                  onClick={() => handleDemoSignIn(account)}
                >
                  <span className="demo-login__identity">
                    <strong>{account.name}</strong>
                    <span>{account.email}</span>
                  </span>
                  <span
                    className={`demo-login__role demo-login__role--${account.role}`}
                  >
                    {account.role === "admin" ? "platform admin" : "user"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "sign-up" && (
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please enter your name." }]}
          >
            <Input
              placeholder="Jane Doe"
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
            prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
            autoComplete={mode === "sign-in" ? "username" : "email"}
          />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[
            { required: true, message: "Please enter your password." },
            { min: 8, message: "Must be at least 8 characters." },
          ]}
        >
          <Input.Password
            placeholder="At least 8 characters"
            prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          />
        </Form.Item>

        {mode === "sign-in" && (
          <Form.Item style={{ marginTop: -8 }}>
            <Button type="link" onClick={() => setResetOpen(true)} style={{ padding: 0 }}>
              Forgot password?
            </Button>
          </Form.Item>
        )}

        {error && (
          <Form.Item>
            <Alert type="error" title={error} showIcon />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </Form.Item>
      </Form>

      {resetOpen && (
        <ResetPasswordModal
          onClose={() => setResetOpen(false)}
          onSuccess={(email, password) => {
            setResetOpen(false);
            form.setFieldsValue({ email, password });
            setError(null);
          }}
        />
      )}
    </>
  );
}
