import { getNotesForCurrentOrganization } from "@/app/notes/actions";
import { NotesContent } from "@/components/notes-content";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/roles";

export default async function NotesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  if (isAdminRole(session.user.role)) {
    redirect("/admin");
  }

  if (!session.session.activeOrganizationId) {
    redirect("/organizations");
  }

  const result = await getNotesForCurrentOrganization();

  return (
    <NotesContent
      user={session.user}
      notes={result.notes}
      canCreate={result.canCreate}
      organization={result.organization}
      teams={result.teams}
      activeTeam={result.activeTeam}
    />
  );
}
