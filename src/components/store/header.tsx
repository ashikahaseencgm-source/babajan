import Link from "next/link";
import { ShoppingBag, User } from "lucide-react";
import { HomeLogoLink } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { SearchOverlay } from "./search-overlay";
import { NavLink } from "./nav-link";
import { getCartCount } from "@/server/cart";
import { getCurrentUser } from "@/server/session";
import { getCategories } from "@/server/catalog";
import { primaryNav, secondaryNav } from "@/lib/site";
import { hasPermission } from "@/server/domain/permissions";

const iconLink =
  "relative inline-flex size-11 items-center justify-center rounded-sm text-navy transition-colors hover:bg-soft/50";

export async function Header() {
  const [count, user, women, men] = await Promise.all([getCartCount(), getCurrentUser(), getCategories("women"), getCategories("men")]);
  const firstName = user?.name.split(" ")[0];
  return (
    <header className="sticky top-0 z-40 border-b border-mist bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/85">
      <div className="container-bs grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 lg:h-[76px]">
        {/* Left: mobile menu / desktop primary nav */}
        <div className="flex items-center">
          <MobileMenu
            women={women.filter((c) => c.productCount > 0).map(({ slug, name }) => ({ slug, name }))}
            men={men.filter((c) => c.productCount > 0).map(({ slug, name }) => ({ slug, name }))}
            signedIn={!!user}
            isStaff={hasPermission(user?.role, "admin:access")}
          />
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <HomeLogoLink />

        {/* Right: secondary nav + utilities */}
        <div className="flex items-center justify-end gap-0.5">
          <nav aria-label="Secondary" className="mr-2 hidden xl:block">
            <ul className="flex items-center gap-1">
              {secondaryNav.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <SearchOverlay />
          <Link href={user ? "/account" : "/sign-in"} className={`${iconLink} hidden sm:inline-flex`}>
            <User className="size-5" strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">{user ? `Your account${firstName ? ` (${firstName})` : ""}` : "Sign in"}</span>
          </Link>
          <Link href="/bag" className={iconLink}>
            <ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">Bag, {count} {count === 1 ? "item" : "items"}</span>
            {count > 0 ? (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-navy px-1 text-[0.625rem] font-semibold leading-[18px] text-white"
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
