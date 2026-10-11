import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/primitives";
import { Listing } from "@/components/store/listing";
import { hasActiveFilters } from "@/lib/listing-params";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: "Shop All",
    description: "Browse every piece from Babajan Sumangali for women and men. Filter by size, colour, occasion and price.",
    alternates: { canonical: "/shop" },
    robots: hasActiveFilters(sp) || sp.page ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: Props) {
  return (
    <>
      <section className="border-b border-mist bg-white">
        <div className="container-bs py-10 lg:py-14">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop all" }]} />
          <h1 className="t-page mt-5">Shop all</h1>
          <p className="mt-3 max-w-xl text-[1.0625rem] text-slate">Every piece, for women and men. Find the one that feels like you.</p>
        </div>
      </section>
      <div className="container-bs py-10">
        <Listing path="/shop" scope={{}} searchParams={await searchParams} showDepartment />
      </div>
    </>
  );
}
