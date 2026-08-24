"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={enUS}
        theme={{
          token: {
            colorPrimary: "#4f46e5",
            colorInfo: "#4f46e5",
            colorSuccess: "#15803d",
            colorWarning: "#b45309",
            colorError: "#dc2626",
            colorBgLayout: "#f4f6fb",
            colorText: "#172033",
            colorTextSecondary: "#667085",
            colorBorderSecondary: "#e7eaf0",
            borderRadius: 12,
            borderRadiusLG: 16,
            controlHeight: 42,
            fontFamily:
              "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          },
          components: {
            Button: {
              controlHeight: 42,
              paddingInline: 18,
              fontWeight: 600,
            },
            Input: {
              controlHeight: 42,
            },
            Layout: {
              headerBg: "#ffffff",
              siderBg: "#ffffff",
              bodyBg: "#f4f6fb",
              footerBg: "#ffffff",
            },
            Menu: {
              itemBorderRadius: 10,
              itemHeight: 44,
              itemMarginInline: 10,
            },
            Card: {
              headerHeight: 58,
              paddingLG: 24,
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
