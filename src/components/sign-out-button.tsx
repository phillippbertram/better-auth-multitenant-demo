"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);

    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleSignOut} loading={loading}>
      Sign out
    </Button>
  );
}
