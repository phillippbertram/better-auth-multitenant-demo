"use client";

import { AuthPage } from "@/components/auth/auth-page";
import type { DemoLoginAccount } from "@/lib/demo-accounts";

type HomeContentProps = {
  authError?: string | null;
  demoAccounts?: readonly DemoLoginAccount[];
  callbackPath: string;
};

export function HomeContent({ authError, demoAccounts, callbackPath }: HomeContentProps) {
  return <AuthPage authError={authError} demoAccounts={demoAccounts} callbackPath={callbackPath} />;
}
