import { config } from "dotenv";
import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

config({ path: ".env.local", quiet: true });

const originUrl = z
  .url()
  .refine(
    (value) => {
      const url = new URL(value);

      return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
      );
    },
    {
      message:
        "Must be an HTTP(S) origin without credentials, a path, query, or fragment.",
    },
  )
  .transform((value) => new URL(value).origin);

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: originUrl,
    DEMO_MODE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    DEMO_SEED_ALLOW_REMOTE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DEMO_MODE: process.env.DEMO_MODE,
    DEMO_SEED_ALLOW_REMOTE: process.env.DEMO_SEED_ALLOW_REMOTE,
  },
});
