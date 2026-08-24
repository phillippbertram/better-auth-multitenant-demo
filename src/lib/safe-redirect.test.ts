import { getSafeInternalPath } from "@/lib/safe-redirect";
import { describe, expect, it } from "vitest";

describe("getSafeInternalPath", () => {
  it("keeps relative invitation callbacks", () => {
    expect(getSafeInternalPath("/invitations/invite-123?source=email")).toBe(
      "/invitations/invite-123?source=email",
    );
  });

  it.each([
    "https://attacker.example/invitation",
    "//attacker.example/invitation",
    "/\\attacker.example/invitation",
    "javascript:alert(1)",
  ])("rejects external or ambiguous callback %s", (value) => {
    expect(getSafeInternalPath(value)).toBe("/notes");
  });
});
