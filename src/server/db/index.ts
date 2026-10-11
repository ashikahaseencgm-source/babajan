import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "@/server/env";

type DB = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __bsPool?: Pool; __bsDb?: DB };

function create(): DB {
  const pool =
    globalForDb.__bsPool ??
    new Pool({
      connectionString: env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
    });
  globalForDb.__bsPool = pool;
  return drizzle(pool, { schema, casing: "snake_case" });
}

export const db: DB = globalForDb.__bsDb ?? create();
if (process.env.NODE_ENV !== "production") globalForDb.__bsDb = db;

export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DbOrTx = DB | Tx;
export { schema };
