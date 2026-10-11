import type { Metadata } from "next";
import { requireUser } from "@/server/session";
import { customerAddresses } from "@/server/account";
import { AddressActions, AddressForm } from "@/components/account/account-forms";
import { Badge } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Your Addresses", robots: { index: false, follow: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await customerAddresses(user.id);
  return (
    <div className="grid gap-12 xl:grid-cols-2">
      <section aria-labelledby="saved">
        <h2 id="saved" className="t-card">
          Saved addresses
        </h2>
        {addresses.length ? (
          <ul className="mt-4 space-y-4">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-xs border border-mist bg-white p-5 text-sm">
                {a.isDefault ? <Badge tone="navy" className="mb-2">Default</Badge> : null}
                <address className="not-italic leading-relaxed">
                  {a.fullName}
                  <br />
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {a.city}, {a.state} {a.postalCode}
                  <br />
                  <span className="text-slate">{a.phone}</span>
                </address>
                <div className="mt-3">
                  <AddressActions id={a.id} isDefault={a.isDefault} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-slate">You haven&rsquo;t saved any addresses yet.</p>
        )}
      </section>
      <section aria-labelledby="add">
        <h2 id="add" className="t-card">
          Add an address
        </h2>
        <div className="mt-4">
          <AddressForm />
        </div>
      </section>
    </div>
  );
}
