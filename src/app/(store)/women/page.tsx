import type { Metadata } from "next";
import { DepartmentPage } from "@/components/store/department-page";
import { hasActiveFilters } from "@/lib/listing-params";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: "Women's Collection",
    description: "Explore women's styles from Babajan Sumangali — pieces for celebrations, everyday elegance, and everything in between.",
    alternates: { canonical: "/women" },
    robots: hasActiveFilters(sp) || sp.page ? { index: false, follow: true } : undefined,
  };
}

export default async function WomenPage({ searchParams }: Props) {
  return <DepartmentPage department="women" searchParams={await searchParams} />;
}
