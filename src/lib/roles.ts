export function isAdminRole(role: string | null | undefined) {
  if (!role) {
    return false;
  }

  return role
    .split(",")
    .map((value) => value.trim())
    .includes("admin");
}
