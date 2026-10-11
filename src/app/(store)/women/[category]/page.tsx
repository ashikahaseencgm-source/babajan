import { CategoryPage, categoryMetadata } from "@/components/store/category-page";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props) {
  return categoryMetadata("women", (await params).category, await searchParams);
}

export default async function Page({ params, searchParams }: Props) {
  return <CategoryPage department="women" slug={(await params).category} searchParams={await searchParams} />;
}
