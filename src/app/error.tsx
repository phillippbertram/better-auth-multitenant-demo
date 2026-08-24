"use client";

import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Space, Typography } from "antd";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="error-state">
      <section className="error-state__card" aria-labelledby="error-title">
        <span className="error-state__icon" aria-hidden="true">
          <WarningOutlined />
        </span>
        <Typography.Title id="error-title" level={2}>
          Something went wrong
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          The page could not be loaded. Try the request again or return to your
          notes.
        </Typography.Paragraph>
        <Space wrap>
          <Button type="primary" icon={<ReloadOutlined />} onClick={retry}>
            Try again
          </Button>
          <Button href="/notes">Go to notes</Button>
        </Space>
      </section>
    </main>
  );
}
