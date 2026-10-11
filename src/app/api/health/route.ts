import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** Liveness + database readiness for uptime checks. Reveals no configuration. */
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ status: "degraded", message: "Database not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
