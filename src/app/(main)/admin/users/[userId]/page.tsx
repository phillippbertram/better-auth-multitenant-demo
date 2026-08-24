import {
  getNotesForUser,
  getOrganizationsForUser,
} from "@/app/admin/actions";
import { AdminUserDetail } from "@/components/admin/admin-user-detail";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";

type AdminUserPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function AdminUserPage({ params }: AdminUserPageProps) {
  await requireAdminSession();

  const { userId } = await params;

  const user = await auth.api.getUser({
    query: { id: userId },
    headers: await headers(),
  });

  if (!user) {
    notFound();
  }

  const [notes, organizations] = await Promise.all([
    getNotesForUser(userId),
    getOrganizationsForUser(userId),
  ]);

  return (
    <AdminUserDetail
      user={user}
      notes={notes}
      organizations={organizations}
    />
  );
}
