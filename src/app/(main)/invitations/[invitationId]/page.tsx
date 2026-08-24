import { InvitationDecision } from "@/components/organization/invitation-decision";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isAdminRole } from "@/lib/roles";

export default async function InvitationPage({
  params,
}: PageProps<"/invitations/[invitationId]">) {
  const { invitationId } = await params;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const invitationPath = `/invitations/${encodeURIComponent(invitationId)}`;

  if (!session?.user) {
    redirect(`/?next=${encodeURIComponent(invitationPath)}`);
  }

  if (isAdminRole(session.user.role)) {
    redirect("/admin");
  }

  const invitation = await auth.api
    .getInvitation({
      query: { id: invitationId },
      headers: requestHeaders,
    })
    .catch(() => notFound());

  return <InvitationDecision invitation={invitation} />;
}
