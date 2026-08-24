"use client";

import { EmailForm } from "@/components/account/email-form";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { PageHeader } from "@/components/layout/page-header";
import { PasskeyManager } from "@/components/passkey-manager";
import { Card, Col, Flex, Row, Typography } from "antd";

type AccountContentProps = {
  user: {
    name: string;
    email: string;
  };
  hasPasswordAccount: boolean;
};

export function AccountContent({ user, hasPasswordAccount }: AccountContentProps) {
  return (
    <>
      <PageHeader
        title="Account settings"
        description="Manage your profile and sign-in options."
      />

      <Row gutter={[24, 24]} align="top">
        <Col xs={24} xl={10}>
          <Flex vertical gap={24}>
            <Card title="Profile" className="surface-card">
              <ProfileForm initialName={user.name} />
            </Card>

            <Card title="Email address" className="surface-card">
              <EmailForm currentEmail={user.email} />
            </Card>
          </Flex>
        </Col>

        <Col xs={24} xl={14}>
          <Flex vertical gap={24}>
            <Card title="Passkeys" className="surface-card">
              <PasskeyManager />
            </Card>

            <Card title="Password" className="surface-card">
              {hasPasswordAccount ? (
                <PasswordForm />
              ) : (
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  This account does not use a password. Sign in with an email
                  code, magic link, or passkey instead.
                </Typography.Paragraph>
              )}
            </Card>
          </Flex>
        </Col>
      </Row>
    </>
  );
}
