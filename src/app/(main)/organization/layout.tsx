import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/");
  }

  if (isAdminRole(session.user.role)) {
    redirect("/admin");
  }

  return children;
}
