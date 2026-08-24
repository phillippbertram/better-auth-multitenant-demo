import { requireAdminSession } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  await requireAdminSession();
  return children;
}
