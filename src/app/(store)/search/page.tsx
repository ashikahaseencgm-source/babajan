import type { Metadata } from "next";
import Form from "next/form";
import { Search } from "lucide-react";
import { Listing } from "@/components/store/listing";
import { Button } from "@/components/ui/button";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100) ?? "";
  return (
    <>
      <section className="border-b border-mist bg-white">
        <div className="container-bs py-10 lg:py-14">
          <h1 className="t-page">{q ? <>Results for &ldquo;{q}&rdquo;</> : "Search"}</h1>
          <Form action="/search" role="search" className="mt-6 flex max-w-2xl gap-2">
            <label htmlFor="q" className="sr-only">
              Search products
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate" aria-hidden="true" />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                maxLength={100}
                placeholder="Name, style code, colour or occasion"
                className="block min-h-12 w-full rounded-sm border border-mist bg-white pl-10 pr-3 text-[0.9375rem] focus-visible:border-blue focus-visible:outline-2 focus-visible:outline-blue"
              />
            </div>
            <Button type="submit" size="lg">
              Search
            </Button>
          </Form>
        </div>
      </section>
      <div className="container-bs py-10">
        {q ? (
          <SearchResults q={q} sp={sp} />
        ) : (
          <p className="text-slate">Enter a product name, style code, colour, or occasion to begin.</p>
        )}
      </div>
    </>
  );
}

async function SearchResults({ q, sp }: { q: string; sp: Record<string, string | string[] | undefined> }) {
  return <Listing
      path="/search"
      scope={{ q }}
      searchParams={sp}
      showDepartment
      emptyMessage={{ title: "We couldn’t find a match", body: "Try another term or explore the collections." }}
    />;
}
