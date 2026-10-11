import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "@/server/env";

type DB = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __bsPool?: Pool; __bsDb?: DB };

function getPool(): Pool {
  if (!globalForDb.__bsPool) {
    globalForDb.__bsPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
    });
  }
  return globalForDb.__bsPool;
}

function getDb(): DB {
  if (!globalForDb.__bsDb) {
    globalForDb.__bsDb = drizzle(getPool(), { schema, casing: "snake_case" });
  }
  return globalForDb.__bsDb;
}

export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DbOrTx = DB | Tx;
export { schema };
