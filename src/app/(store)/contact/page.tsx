import type { Metadata } from "next";
import { getSettings } from "@/server/settings";
import { ContactForm } from "@/components/store/contact-form";
import { SplitWords, Reveal } from "@/components/motion/primitives";

export const metadata: Metadata = {
  title: "Contact Our Team",
  description: "Questions about sizing, an order, or a piece you love? Contact the Babajan Sumangali team.",
  alternates: { canonical: "/contact" },
};

type Props = { searchParams: Promise<{ topic?: string; order?: string; product?: string }> };

export default async function ContactPage({ searchParams }: Props) {
  const [{ contact }, sp] = await Promise.all([getSettings(), searchParams]);
  const topics = ["order", "sizing", "product", "returns", "other"];
  const hasDetails = contact.email || contact.phone || contact.whatsapp || contact.address;
  return (
    <div className="container-bs grid gap-12 py-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20 lg:py-20">
      <div>
        <p className="t-eyebrow">Customer care</p>
        <SplitWords as="h1" text="We're here to help" className="t-page mt-4" onView={false} />
        <Reveal delay={0.2}>
          <p className="mt-4 max-w-md text-slate">Questions about sizing, an order, or a piece you love? Send us a message and our team will reply by email.</p>
        </Reveal>
        {hasDetails ? (
          <dl className="mt-10 space-y-5 text-sm">
            {contact.email ? (
              <div>
                <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy">Email</dt>
                <dd className="mt-1">
                  <a href={`mailto:${contact.email}`} className="link">
                    {contact.email}
                  </a>
                </dd>
              </div>
            ) : null}
            {contact.phone ? (
              <div>
                <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy">Phone</dt>
                <dd className="mt-1">
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="link">
                    {contact.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {contact.hours ? (
              <div>
                <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy">Hours</dt>
                <dd className="mt-1">{contact.hours}</dd>
              </div>
            ) : null}
            {contact.address ? (
              <div>
                <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy">Visit</dt>
                <dd className="mt-1 whitespace-pre-line">{contact.address}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
      <div className="rounded-xs border border-mist bg-white p-6 sm:p-8">
        <ContactForm
          defaults={{
            topic: sp.topic && topics.includes(sp.topic) ? sp.topic : undefined,
            orderNumber: sp.order?.slice(0, 30),
            message: sp.product ? `About style ${sp.product.slice(0, 30)}: ` : undefined,
          }}
        />
      </div>
    </div>
  );
}
