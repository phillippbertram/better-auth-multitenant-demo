"use client";

import { authClient } from "@/lib/auth-client";
import { Alert, Button, Form, Input } from "antd";
import { useState } from "react";

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function PasswordForm() {
  const [form] = Form.useForm<PasswordFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: PasswordFormValues) {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setError(result.error.message ?? "Could not change password.");
        return;
      }

      setSuccess("Password updated. Other sessions were signed out.");
      form.resetFields();
    } catch {
      setError("Could not change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      size="large"
      onFinish={handleSubmit}
    >
      <Form.Item
        label="Current password"
        name="currentPassword"
        rules={[{ required: true, message: "Please enter your current password." }]}
      >
        <Input.Password placeholder="Current password" />
      </Form.Item>

      <Form.Item
        label="New password"
        name="newPassword"
        rules={[
          { required: true, message: "Please enter a new password." },
          { min: 8, message: "Must be at least 8 characters." },
        ]}
      >
        <Input.Password placeholder="At least 8 characters" />
      </Form.Item>

      <Form.Item
        label="Confirm new password"
        name="confirmPassword"
        dependencies={["newPassword"]}
        rules={[
          { required: true, message: "Please confirm your new password." },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("newPassword") === value) {
                return Promise.resolve();
              }

              return Promise.reject(new Error("Passwords do not match."));
            },
          }),
        ]}
      >
        <Input.Password placeholder="Repeat new password" />
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
          Change password
        </Button>
      </Form.Item>
    </Form>
  );
}
