import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/server/db";

/**
 * Fixed-window rate limiter backed by PostgreSQL so limits hold across
 * multiple server instances. Single atomic upsert per check.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit_bucket (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit_bucket.window_start < now() - make_interval(secs => ${windowSeconds})
                   THEN 1 ELSE rate_limit_bucket.count + 1 END,
      window_start = CASE WHEN rate_limit_bucket.window_start < now() - make_interval(secs => ${windowSeconds})
                   THEN now() ELSE rate_limit_bucket.window_start END
    RETURNING count
  `);
  return Number(result.rows[0]?.count ?? 0) <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/** Convenience: limit an action per client IP. */
export async function limitByIp(action: string, limit: number, windowSeconds: number) {
  const ip = await clientIp();
  return consumeRateLimit(`${action}:${ip}`, limit, windowSeconds);
}
