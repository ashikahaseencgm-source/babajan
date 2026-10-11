import { NextResponse } from "next/server";
import { searchSuggestions } from "@/server/catalog";
import { limitByIp } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return NextResponse.json({ items: [] });
  if (!(await limitByIp("search", 60, 60))) return NextResponse.json({ items: [] }, { status: 429 });
  const items = await searchSuggestions(q, 6);
  return NextResponse.json(
    { items: items.map((p) => ({ slug: p.slug, name: p.name, price: p.price, categoryName: p.categoryName })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
