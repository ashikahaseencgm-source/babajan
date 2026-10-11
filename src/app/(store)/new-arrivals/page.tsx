import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/primitives";
import { Listing } from "@/components/store/listing";
import { hasActiveFilters } from "@/lib/listing-params";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: "New Arrivals",
    description: "Meet the latest additions to the Babajan Sumangali collection for women and men.",
    alternates: { canonical: "/new-arrivals" },
    robots: hasActiveFilters(sp) || sp.page || sp.sort ? { index: false, follow: true } : undefined,
  };
}

export default async function NewArrivalsPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <>
      <section className="border-b border-mist bg-white">
        <div className="container-bs py-10 lg:py-14">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "New arrivals" }]} />
          <h1 className="t-page mt-5">New arrivals</h1>
          <p className="mt-3 max-w-xl text-[1.0625rem] text-slate">Meet the latest additions to the collection.</p>
        </div>
      </section>
      <div className="container-bs py-10">
        <Listing path="/new-arrivals" scope={{}} searchParams={{ sort: "newest", ...sp }} showDepartment />
      </div>
    </>
  );
}
