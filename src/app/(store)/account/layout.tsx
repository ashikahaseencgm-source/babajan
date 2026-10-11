import Link from "next/link";
import { requireUser } from "@/server/session";
import { signOutAction } from "@/app/actions/auth";
import { NavLink } from "@/components/store/nav-link";
import { hasPermission } from "@/server/domain/permissions";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div className="container-bs py-10 lg:py-14">
      <p className="t-eyebrow">Your account</p>
      <h1 className="t-page mt-3">Hello, {user.name.split(" ")[0]}</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[13rem_1fr] lg:gap-14">
        <nav aria-label="Account" className="border-b border-mist pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            <li>
              <NavLink href="/account">Overview</NavLink>
            </li>
            <li>
              <NavLink href="/account/orders">Orders</NavLink>
            </li>
            <li>
              <NavLink href="/account/addresses">Addresses</NavLink>
            </li>
            <li>
              <NavLink href="/account/profile">Profile &amp; security</NavLink>
            </li>
            {hasPermission(user.role, "admin:access") ? (
              <li>
                <Link href="/admin" className="inline-flex min-h-11 items-center px-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-blue">
                  Store admin
                </Link>
              </li>
            ) : null}
            <li>
              <form action={signOutAction}>
                <button type="submit" className="inline-flex min-h-11 items-center px-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate hover:text-error">
                  Sign out
                </button>
              </form>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
