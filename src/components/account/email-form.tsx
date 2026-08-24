"use client";

import { authClient } from "@/lib/auth-client";
import { Alert, Button, Form, Input, Typography } from "antd";
import { useState } from "react";

type EmailFormProps = {
  currentEmail: string;
};

type EmailFormValues = {
  newEmail: string;
};

export function EmailForm({ currentEmail }: EmailFormProps) {
  const [form] = Form.useForm<EmailFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: EmailFormValues) {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await authClient.changeEmail({
        newEmail: values.newEmail.trim(),
        callbackURL: "/account",
      });

      if (result.error) {
        setError(result.error.message ?? "Could not request email change.");
        return;
      }

      setSuccess(
        "Verification email sent. In development, check the server terminal for the link.",
      );
      form.resetFields();
    } catch {
      setError("Could not request email change.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Current email: <Typography.Text strong>{currentEmail}</Typography.Text>
      </Typography.Paragraph>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        size="large"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="New email"
          name="newEmail"
          rules={[
            { required: true, message: "Please enter a new email." },
            { type: "email", message: "Please enter a valid email." },
          ]}
        >
          <Input placeholder="new-email@example.com" />
        </Form.Item>

        {error && (
          <Form.Item>
            <Alert type="error" title={error} showIcon />
          </Form.Item>
        )}

        {success && (
          <Form.Item>
            <Alert type="success" title={success} showIcon />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Change email
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
