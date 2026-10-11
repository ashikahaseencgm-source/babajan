"use client";

import Script from "next/script";
import { useState, useTransition } from "react";
import { abandonOrderAction, confirmRazorpayAction, simulatePaymentAction } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import type { ClientCheckoutConfig } from "@/server/payments/types";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (ev: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

export function PaymentPanel({
  orderId,
  token,
  amountLabel,
  config,
  prefill,
  nonce,
  testMode,
}: {
  orderId: string;
  token: string;
  amountLabel: string;
  config: ClientCheckoutConfig;
  prefill: { email: string; contact: string; name: string };
  nonce?: string;
  testMode: boolean;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  function payWithRazorpay() {
    if (config.provider !== "razorpay" || !window.Razorpay) {
      setMessage({ tone: "error", text: "The payment window couldn't load. Please check your connection and try again." });
      return;
    }
    setMessage(null);
    const rzp = new window.Razorpay({
      key: config.keyId,
      order_id: config.providerOrderId,
      amount: config.amount,
      currency: config.currency,
      name: "Babajan Sumangali",
      prefill,
      theme: { color: "#0F2D4F" },
      handler: (res: RazorpayResponse) => {
        start(async () => {
          const r = await confirmRazorpayAction(orderId, token, res);
          if (r && !r.ok) setMessage({ tone: "error", text: r.message });
        });
      },
      modal: { ondismiss: () => setMessage({ tone: "info", text: "Payment window closed. Your items are still held — you can try again." }) },
    });
    rzp.on("payment.failed", (r) => setMessage({ tone: "error", text: `Payment was not completed${r.error?.description ? `: ${r.error.description}` : ""}. No money has been taken. You can try again.` }));
    rzp.open();
  }

  function simulate(outcome: "success" | "failure") {
    setMessage(null);
    start(async () => {
      const r = await simulatePaymentAction(orderId, token, outcome);
      if (r && !r.ok) setMessage({ tone: outcome === "failure" ? "info" : "error", text: r.message });
    });
  }

  return (
    <div className="space-y-6">
      {config.provider === "razorpay" ? (
        <>
          <Script src="https://checkout.razorpay.com/v1/checkout.js" nonce={nonce} strategy="afterInteractive" onReady={() => setScriptReady(true)} />
          <Button type="button" size="lg" className="w-full sm:w-auto" onClick={payWithRazorpay} pending={pending} disabled={!scriptReady}>
            Pay {amountLabel} securely
          </Button>
          <p className="text-[0.8125rem] text-slate">You&rsquo;ll complete payment in Razorpay&rsquo;s secure window. We never see or store your card details.</p>
        </>
      ) : testMode ? (
        <div className="rounded-sm border border-dashed border-gold bg-warn p-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-charcoal">Test payment mode</p>
          <p className="mt-2 text-sm text-charcoal">
            No real payment provider is connected and no money will move. Choose an outcome to simulate the provider&rsquo;s signed response.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => simulate("success")} pending={pending}>
              Simulate successful payment of {amountLabel}
            </Button>
            <Button type="button" variant="secondary" onClick={() => simulate("failure")} disabled={pending}>
              Simulate failed payment
            </Button>
          </div>
        </div>
      ) : null}

      <div aria-live="polite">{message ? <Alert tone={message.tone === "error" ? "error" : "info"}>{message.text}</Alert> : null}</div>

      <form action={() => start(async () => abandonOrderAction(orderId, token))}>
        <button type="submit" className="link min-h-11 text-sm" disabled={pending}>
          Return to bag and change my order
        </button>
      </form>
    </div>
  );
}
