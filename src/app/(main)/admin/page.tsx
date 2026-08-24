import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { headers } from "next/headers";
import { requireAdminSession } from "@/lib/admin";

function countAdmins(users: { role?: string | null }[]) {
  return users.filter((user) => isAdminRole(user.role)).length;
}

function countBanned(users: { banned?: boolean | null }[]) {
  return users.filter((user) => user.banned).length;
}

export default async function AdminPage() {
  await requireAdminSession();

  const result = await auth.api.listUsers({
    query: {
      limit: 100,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
    headers: await headers(),
  });

  const bannedCount = countBanned(result.users);
  const adminCount = countAdmins(result.users);

  return (
    <>
      <PageHeader
        title="Platform administration"
        description="Manage global users and inspect organization memberships and authored notes."
      />

      <section className="platform-admin-scope" aria-label="Global platform scope">
        <strong>Global platform scope</strong>
        <p>
          This workspace is separate from organization memberships. Open a user
          to inspect their organizations and notes across tenants.
        </p>
      </section>

      <AdminDashboard
        users={result.users}
        total={result.total}
        stats={{
          total: result.total,
          admins: adminCount,
          banned: bannedCount,
          active: result.total - bannedCount,
        }}
      />
    </>
  );
}
