"use client";

import { EmailOtpForm } from "@/components/auth/email-otp-form";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { PasskeyAuthForm } from "@/components/auth/passkey-auth-form";
import { PasswordAuthForm } from "@/components/auth/password-auth-form";
import type { DemoLoginAccount } from "@/lib/demo-accounts";
import {
  KeyOutlined,
  LinkOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Alert, Tabs, Typography } from "antd";
import { useMemo, useState } from "react";

export type AuthMode = "sign-in" | "sign-up";
export type AuthMethod = "password" | "email-otp" | "magic-link" | "passkey";

type AuthFormsProps = {
  authError?: string | null;
  demoAccounts?: readonly DemoLoginAccount[];
  callbackPath: string;
};

const signInMethodOptions = [
  {
    value: "password" as const,
    label: "Password",
    icon: <KeyOutlined />,
  },
  {
    value: "email-otp" as const,
    label: "Email code",
    icon: <MailOutlined />,
  },
  {
    value: "magic-link" as const,
    label: "Magic link",
    icon: <LinkOutlined />,
  },
  {
    value: "passkey" as const,
    label: "Passkey",
    icon: <SafetyCertificateOutlined />,
  },
];

const signUpMethodOptions = signInMethodOptions.filter(
  (option) => option.value !== "passkey",
);

export function AuthForms({ authError, demoAccounts, callbackPath }: AuthFormsProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [method, setMethod] = useState<AuthMethod>("password");

  const methodOptions =
    mode === "sign-in" ? signInMethodOptions : signUpMethodOptions;

  function handleModeChange(value: string) {
    const nextMode = value as AuthMode;

    if (nextMode === "sign-up" && method === "passkey") {
      setMethod("password");
    }

    setMode(nextMode);
  }

  const heading = useMemo(() => {
    if (mode === "sign-in") {
      switch (method) {
        case "email-otp":
          return "Email code";
        case "magic-link":
          return "Magic link";
        case "passkey":
          return "Passkey";
        default:
          return "Sign in";
      }
    }

    switch (method) {
      case "email-otp":
        return "Create account with a code";
      case "magic-link":
        return "Create account with a link";
      default:
        return "Create your account";
    }
  }, [mode, method]);

  const subheading = useMemo(() => {
    if (mode === "sign-in") {
      switch (method) {
        case "email-otp":
          return "We will send a 6-digit code to your email.";
        case "magic-link":
          return "We will send a sign-in link to your email.";
        case "passkey":
          return "Choose a passkey from your device or password manager.";
        default:
          return "Enter your email and password.";
      }
    }

    switch (method) {
      case "email-otp":
        return "We will send a code to verify your email.";
      case "magic-link":
        return "We will send a link to verify your email.";
      default:
        return "Enter your name, email, and a password.";
    }
  }, [mode, method]);

  return (
    <>
      <h2 className="auth-card-heading">{heading}</h2>
      <p className="auth-card-subheading">{subheading}</p>

      {authError && (
        <Alert
          type="error"
          title="Magic link verification failed"
          description={authError}
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Tabs
        className="auth-mode-tabs"
        activeKey={mode}
        centered
        items={[
          { key: "sign-in", label: "Sign in" },
          { key: "sign-up", label: "Sign up" },
        ]}
        onChange={handleModeChange}
      />

      <div
        className="auth-method-grid"
        role="group"
        aria-label="Authentication method"
      >
        {methodOptions.map((option) => {
          const isActive = method === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              className={`auth-method-button${isActive ? " auth-method-button--active" : ""}`}
              onClick={() => setMethod(option.value)}
            >
              <span className="auth-method-button__icon" aria-hidden="true">
                {option.icon}
              </span>
              <span className="auth-method-button__label">{option.label}</span>
            </button>
          );
        })}
      </div>

      {mode === "sign-up" && (
        <Typography.Paragraph
          type="secondary"
          style={{ marginTop: -8, marginBottom: 16 }}
        >
          Add a passkey from your account settings after signing up.
        </Typography.Paragraph>
      )}

      {method === "password" ? (
        <PasswordAuthForm mode={mode} demoAccounts={demoAccounts} callbackPath={callbackPath} />
      ) : method === "email-otp" ? (
        <EmailOtpForm key={`${mode}-${method}`} mode={mode} callbackPath={callbackPath} />
      ) : method === "magic-link" ? (
        <MagicLinkForm key={`${mode}-${method}`} mode={mode} callbackPath={callbackPath} />
      ) : (
        <PasskeyAuthForm callbackPath={callbackPath} />
      )}
    </>
  );
}
