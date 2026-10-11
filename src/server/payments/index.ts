import "server-only";
import { env } from "@/server/env";
import { razorpayProvider } from "./razorpay";
import { testProvider } from "./test-provider";
import type { PaymentProvider, ProviderId } from "./types";

export function activeProvider(): PaymentProvider {
  return env.PAYMENT_PROVIDER === "razorpay" ? razorpayProvider : testProvider;
}

export function providerById(id: string): PaymentProvider | null {
  if (id === "razorpay") return razorpayProvider;
  if (id === "test" && env.APP_ENV !== "production") return testProvider;
  return null;
}

export type { PaymentProvider, ProviderId };
