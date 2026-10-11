import type { Metadata } from "next";
import { DepartmentPage } from "@/components/store/department-page";
import { hasActiveFilters } from "@/lib/listing-params";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: "Men's Collection",
    description: "Explore men's styles from Babajan Sumangali — modern silhouettes and considered details for your next occasion.",
    alternates: { canonical: "/men" },
    robots: hasActiveFilters(sp) || sp.page ? { index: false, follow: true } : undefined,
  };
}

export default async function MenPage({ searchParams }: Props) {
  return <DepartmentPage department="men" searchParams={await searchParams} />;
}
