export function logDevelopmentAuthMessage(message: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Email delivery is not configured. Connect an email provider before using this flow in production.",
    );
  }

  console.info(message);
}
