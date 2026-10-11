import { NextResponse } from "next/server";
import { env } from "@/server/env";
import { safeEqual } from "@/server/crypto";
import { expireStaleOrders } from "@/server/orders/service";

export const dynamic = "force-dynamic";

/** Releases stock held by unpaid orders. Call every 5 minutes with `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!env.CRON_SECRET || !safeEqual(auth, `Bearer ${env.CRON_SECRET}`)) return new NextResponse(null, { status: 401 });
  const expired = await expireStaleOrders();
  return NextResponse.json({ expired });
}

export const GET = POST;
