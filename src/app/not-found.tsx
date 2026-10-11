import Link from "next/link";
import { HomeLogoLink } from "@/components/store/logo";
import { LinkButton } from "@/components/ui/button";
import { ArchMark } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-mist">
        <div className="container-bs flex h-16 items-center justify-center lg:h-[76px]">
          <HomeLogoLink />
        </div>
      </header>
      <main id="main" className="container-bs flex flex-1 flex-col items-center justify-center py-16 text-center">
        <ArchMark className="h-24 w-16 text-gold" />
        <p className="t-eyebrow mt-8">Page not found</p>
        <h1 className="t-page mt-3">This story has moved on</h1>
        <p className="mt-4 max-w-md text-slate">The page you&rsquo;re looking for doesn&rsquo;t exist or is no longer available. Let&rsquo;s find you something new.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton href="/">Return Home</LinkButton>
          <LinkButton href="/search" variant="secondary">
            Search the Store
          </LinkButton>
        </div>
        <nav aria-label="Popular" className="mt-10 flex gap-6 text-sm">
          <Link href="/women" className="link">
            Women
          </Link>
          <Link href="/men" className="link">
            Men
          </Link>
          <Link href="/collections" className="link">
            Collections
          </Link>
        </nav>
      </main>
    </div>
  );
}
