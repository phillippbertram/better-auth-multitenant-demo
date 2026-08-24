"use client";

import { Breadcrumb, Flex, Typography } from "antd";
import type { BreadcrumbProps } from "antd";
import Link from "next/link";

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  breadcrumb?: BreadcrumbProps["items"];
  extra?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  breadcrumb,
  extra,
}: PageHeaderProps) {
  return (
    <Flex vertical gap={8} className="page-header">
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb
          items={breadcrumb}
          itemRender={(route, _, routes) => {
            const isLast = routes.indexOf(route) === routes.length - 1;

            if (isLast || !route.href) {
              return <span>{route.title}</span>;
            }

            return <Link href={route.href}>{route.title}</Link>;
          }}
        />
      )}
      <Flex justify="space-between" align="start" gap={16} wrap>
        <Typography.Title level={2} className="page-header__title">
          {title}
        </Typography.Title>
        {extra}
      </Flex>
      {description && (
        <Typography.Paragraph type="secondary" className="page-header__description">
          {description}
        </Typography.Paragraph>
      )}
    </Flex>
  );
}
