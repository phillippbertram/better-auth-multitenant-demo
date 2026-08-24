import { HomeContent } from "@/components/home-content";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { getDemoLoginAccounts } from "@/lib/demo-accounts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSafeInternalPath } from "@/lib/safe-redirect";
import { isAdminRole } from "@/lib/roles";

export default async function Home({ searchParams }: PageProps<"/">) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const params = await searchParams;
  const callbackPath = getSafeInternalPath(
    typeof params.next === "string" ? params.next : undefined,
    "/notes",
  );

  if (session) {
    if (isAdminRole(session.user.role)) {
      redirect("/admin");
    }

    if (typeof params.next === "string") {
      redirect(callbackPath);
    }
    redirect(session.session.activeOrganizationId ? "/notes" : "/organizations");
  }
  const authError =
    typeof params.error === "string"
      ? "The sign-in link is invalid or has expired. Request a new link and try again."
      : null;

  return (
    <HomeContent
      authError={authError}
      demoAccounts={env.DEMO_MODE ? getDemoLoginAccounts() : undefined}
      callbackPath={callbackPath}
    />
  );
}
