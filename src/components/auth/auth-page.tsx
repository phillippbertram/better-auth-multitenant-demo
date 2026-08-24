"use client";

import { AuthForms } from "@/components/auth-forms";
import {
  LockOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { DemoLoginAccount } from "@/lib/demo-accounts";
import "./auth-page.css";

type AuthPageProps = {
  authError?: string | null;
  demoAccounts?: readonly DemoLoginAccount[];
  callbackPath: string;
};

const features = [
  {
    icon: <LockOutlined />,
    text: "Password and passwordless sign-in",
  },
  {
    icon: <SafetyCertificateOutlined />,
    text: "Passkey registration and sign-in",
  },
  {
    icon: <TeamOutlined />,
    text: "Organizations, teams, and shared notes",
  },
];

export function AuthPage({ authError, demoAccounts, callbackPath }: AuthPageProps) {
  return (
    <div className="auth-page">
      <section className="auth-page__hero" aria-label="Product overview">
        <div className="auth-page__hero-content">
          <div className="auth-page__badge">
            <ThunderboltOutlined />
            Better Auth Organizations
          </div>

          <h1 className="auth-page__title">Sign in to the demo</h1>
          <p className="auth-page__description">
            Sign in to explore organizations, memberships, invitations, teams,
            dynamic roles, shared notes, and platform administration.
          </p>

          <ul className="auth-page__features">
            {features.map((feature) => (
              <li key={feature.text} className="auth-page__feature">
                <span className="auth-page__feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <span>{feature.text}</span>
              </li>
            ))}
          </ul>

          <div className="auth-page__stack" aria-label="Technology stack">
            <span>Next.js 16</span>
            <span>Better Auth</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </section>

      <section className="auth-page__panel" aria-label="Authentication">
        <div className="auth-page__card">
            <AuthForms authError={authError} demoAccounts={demoAccounts} callbackPath={callbackPath} />
        </div>
      </section>
    </div>
  );
}
