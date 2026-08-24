import { env } from "@/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type PostgresClient = ReturnType<typeof postgres>;

const globalForPostgres = globalThis as typeof globalThis & {
  postgresClient?: PostgresClient;
};

const client =
  globalForPostgres.postgresClient ??
  postgres(env.DATABASE_URL, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgresClient = client;
}

export const db = drizzle(client, { schema });

export async function closeDatabaseConnection() {
  await client.end({ timeout: 5 });

  if (globalForPostgres.postgresClient === client) {
    delete globalForPostgres.postgresClient;
  }
}
