import { AccountContent } from "@/components/account/account-content";
import { db } from "@/db";
import { account } from "@/db/auth-schema";
import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function userHasPasswordAccount(userId: string) {
  const rows = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  return rows.length > 0;
}

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const hasPasswordAccount = await userHasPasswordAccount(session.user.id);

  return (
    <AccountContent
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      hasPasswordAccount={hasPasswordAccount}
    />
  );
}
