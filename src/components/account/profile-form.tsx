"use client";

import { authClient } from "@/lib/auth-client";
import { Alert, Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProfileFormProps = {
  initialName: string;
};

type ProfileFormValues = {
  name: string;
};

export function ProfileForm({ initialName }: ProfileFormProps) {
  const router = useRouter();
  const [form] = Form.useForm<ProfileFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: ProfileFormValues) {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await authClient.updateUser({
        name: values.name.trim(),
      });

      if (result.error) {
        setError(result.error.message ?? "Could not update profile.");
        return;
      }

      setSuccess("Profile updated.");
      router.refresh();
    } catch {
      setError("Could not update profile.");
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
      initialValues={{ name: initialName }}
      onFinish={handleSubmit}
    >
      <Form.Item
        label="Display name"
        name="name"
        rules={[{ required: true, message: "Please enter your name." }]}
      >
        <Input placeholder="Jane Doe" />
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
          Save profile
        </Button>
      </Form.Item>
    </Form>
  );
}
