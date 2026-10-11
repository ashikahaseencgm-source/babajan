import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

/** Liveness + database readiness for uptime checks. Reveals no configuration. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
