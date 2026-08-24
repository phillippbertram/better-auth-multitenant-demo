export function getSafeInternalPath(
  value: string | string[] | undefined | null,
  fallback = "/notes",
) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }

  try {
    const base = new URL("https://internal.invalid");
    const target = new URL(value, base);

    if (target.origin !== base.origin) {
      return fallback;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
