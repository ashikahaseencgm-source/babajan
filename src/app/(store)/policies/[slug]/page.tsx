import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getSettings, type Settings } from "@/server/settings";
import { Alert, Breadcrumbs } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";

/*
 * DRAFT policy content. These texts describe how the platform behaves and
 * pull concrete values (shipping fees, return window) from store settings.
 * They are NOT legal advice and are shown with a "draft" notice until the
 * owner marks each policy approved in Admin → Settings.
 */
type Policy = { title: string; key: keyof Settings["policies"]; description: string; body: (s: Settings) => ReactNode };

const policies: Record<string, Policy> = {
  shipping: {
    title: "Shipping & Delivery",
    key: "shipping",
    description: "Where we deliver, delivery charges, and how to track your order.",
    body: (s) => (
      <>
        <h2>Where we deliver</h2>
        <p>We currently deliver to addresses in {s.shipping.countries.includes("IN") ? "India" : s.shipping.countries.join(", ")}.</p>
        <h2>Delivery options and charges</h2>
        <ul>
          {s.shipping.methods.map((m) => (
            <li key={m.id}>
              <strong>{m.label}</strong>: {m.fee === 0 ? "complimentary" : formatMoney(m.fee)}
              {m.freeAbove != null && m.fee > 0 ? `, complimentary on orders of ${formatMoney(m.freeAbove)} or more` : ""}
              {m.estimate ? ` — usually ${m.estimate}` : ""}.
            </li>
          ))}
        </ul>
        <p>The delivery charge for your order is always shown at checkout before you pay.</p>
        <h2>Processing and tracking</h2>
        <p>
          Orders are prepared after payment is confirmed. When your order ships we&rsquo;ll email you, and any carrier tracking details will appear on your order page. You can find
          your order in <Link href="/account/orders">your account</Link> or via <Link href="/order-lookup">order lookup</Link>.
        </p>
        <h2>Questions</h2>
        <p>
          <Link href="/contact?topic=order">Contact our team</Link> with your order number and we&rsquo;ll help.
        </p>
      </>
    ),
  },
  returns: {
    title: "Returns & Refunds",
    key: "returns",
    description: "Our returns policy, refund timing, and how to start a return.",
    body: (s) => (
      <>
        <h2>Returns</h2>
        {s.returns.acceptsReturns ? (
          <p>
            You may request a return within {s.returns.windowDays ?? "—"} days of delivery for eligible items in their original condition with tags attached. To start a
            return, <Link href="/contact?topic=returns">contact our team</Link> with your order number.
          </p>
        ) : (
          <p>
            Our returns terms are being finalised. Before you buy, please <Link href="/contact?topic=returns">contact our team</Link> if you have any questions about returning an
            item.
          </p>
        )}
        <h2>Cancellations</h2>
        <p>If you need to cancel an order, contact us as soon as possible. Orders that have not yet shipped can usually be cancelled and refunded in full.</p>
        <h2>Refunds</h2>
        <p>
          Approved refunds are issued to your original payment method through our payment provider. Your bank or card issuer may take several working days to show the
          refund.
        </p>
      </>
    ),
  },
  privacy: {
    title: "Privacy Policy",
    key: "privacy",
    description: "What personal information we collect, why, and your choices.",
    body: () => (
      <>
        <h2>What we collect</h2>
        <ul>
          <li>Account details you give us: name, email address and password (stored only as a secure hash).</li>
          <li>Order details: delivery address, mobile number, items purchased and order history.</li>
          <li>Messages you send through our contact form.</li>
          <li>Newsletter subscriptions, only after you confirm by email.</li>
        </ul>
        <h2>Payments</h2>
        <p>Payments are processed by our payment provider. We never see or store your full card details.</p>
        <h2>How we use your information</h2>
        <p>To process and deliver orders, provide customer support, keep your account secure, and — only if you opt in — send occasional updates about new arrivals.</p>
        <h2>Cookies</h2>
        <p>
          We use essential cookies to keep you signed in and remember your bag. See our <Link href="/policies/cookies">cookie policy</Link>.
        </p>
        <h2>Your choices</h2>
        <p>
          You can update your details in your account, unsubscribe from emails at any time, or <Link href="/contact">contact us</Link> to request access to or deletion of your
          personal information.
        </p>
      </>
    ),
  },
  terms: {
    title: "Terms of Service",
    key: "terms",
    description: "The terms that apply when you use this website and place an order.",
    body: () => (
      <>
        <h2>Orders</h2>
        <p>
          An order is confirmed only when payment has been verified by our payment provider and you receive our confirmation. Items are held for a limited time while you
          complete payment.
        </p>
        <h2>Prices and availability</h2>
        <p>Prices are shown in Indian Rupees. We aim to keep product information, prices and availability accurate; if an error affects your order we&rsquo;ll contact you before proceeding.</p>
        <h2>Product presentation</h2>
        <p>We present colours, fabrics and details as accurately as we can. Screen settings may affect how colours appear.</p>
        <h2>Contact</h2>
        <p>
          Questions about these terms? <Link href="/contact">Contact our team</Link>.
        </p>
      </>
    ),
  },
  cookies: {
    title: "Cookie Policy",
    key: "cookies",
    description: "The cookies this website uses and why.",
    body: () => (
      <>
        <h2>Essential cookies only</h2>
        <p>This website currently uses only cookies that are necessary for it to work:</p>
        <ul>
          <li>
            <strong>Session cookie</strong> — keeps you signed in to your account.
          </li>
          <li>
            <strong>Bag cookie</strong> — remembers the items in your bag (up to 60 days).
          </li>
        </ul>
        <p>We do not currently use advertising or analytics cookies. If that changes, we&rsquo;ll ask for your consent first.</p>
      </>
    ),
  },
};

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(policies).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = policies[(await params).slug];
  if (!p) return { title: "Not found" };
  return { title: p.title, description: p.description, alternates: { canonical: `/policies/${(await params).slug}` } };
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = policies[slug];
  if (!policy) notFound();
  const settings = await getSettings();
  const approved = settings.policies[policy.key];
  return (
    <div className="container-bs py-10 lg:py-14">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: policy.title }]} />
      <h1 className="t-page mt-5">{policy.title}</h1>
      {!approved ? (
        <Alert tone="warning" className="mt-6 max-w-3xl" title="Draft — pending review by Babajan Sumangali">
          This policy is a working draft and has not yet been approved. It may change before the store opens.
        </Alert>
      ) : null}
      <div className="prose-bs mt-8">{policy.body(settings)}</div>
    </div>
  );
}
