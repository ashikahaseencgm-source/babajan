/** Catalogue types and constants that are safe to use in client components. */
export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export type Facets = {
  sizes: string[];
  colours: { name: string; hex: string | null }[];
  occasions: string[];
  categories: { slug: string; name: string }[];
  price: { min: number; max: number } | null;
};
