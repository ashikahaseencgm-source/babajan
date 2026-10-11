import { NextResponse } from "next/server";
import { handleProviderWebhook } from "@/server/orders/service";

/**
 * Payment provider webhooks: /api/webhooks/razorpay (and /api/webhooks/test
 * outside production). The raw body is read as text so the HMAC signature is
 * verified against the exact bytes the provider sent.
 */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "razorpay" && provider !== "test") return new NextResponse(null, { status: 404 });
  const raw = await req.text();
  if (raw.length > 512 * 1024) return new NextResponse(null, { status: 413 });
  try {
    const result = await handleProviderWebhook(provider, raw, req.headers);
    // 2xx for processed/duplicate/ignored so the provider stops retrying; 4xx for bad signatures.
    return NextResponse.json({ outcome: result.outcome }, { status: result.status });
  } catch (err) {
    console.error(`[webhook:${provider}] processing failed`, err instanceof Error ? err.message : err);
    // 500 → provider retries later; processing is idempotent.
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
