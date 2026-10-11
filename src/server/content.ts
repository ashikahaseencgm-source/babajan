import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cache } from "react";
import { db, schema } from "@/server/db";

/**
 * Editable homepage content. Every block has a strict schema: plain text
 * fields only (rendered as text, never HTML) and internal links only.
 */
const internalHref = z
  .string()
  .trim()
  .regex(/^\/(?!\/)[A-Za-z0-9\-/_?=&.%]*$/, "Links must be internal paths starting with “/”.")
  .max(200);
const uploadUrl = z
  .string()
  .regex(/^\/(uploads|images|brand)\/[A-Za-z0-9\-/_.]+$/, "Images must be uploaded through the admin.")
  .nullable();

export const contentSchemas = {
  "home.hero": z.object({
    eyebrow: z.string().trim().max(60),
    headline: z.string().trim().min(1).max(80),
    body: z.string().trim().max(240),
    primaryLabel: z.string().trim().min(1).max(40),
    primaryHref: internalHref,
    secondaryLabel: z.string().trim().max(40),
    secondaryHref: internalHref.or(z.literal("")),
    imageUrl: uploadUrl,
    imageAlt: z.string().trim().max(200),
    /** Up to two light-backdrop figures that float beside the hero arch. */
    accents: z
      .array(z.object({ url: uploadUrl.unwrap(), alt: z.string().trim().max(200) }))
      .max(2)
      .default([]),
  }),
  "home.announcement": z.object({
    enabled: z.boolean(),
    text: z.string().trim().max(120),
    href: internalHref.or(z.literal("")),
  }),
  "home.story": z.object({
    eyebrow: z.string().trim().max(60),
    headline: z.string().trim().min(1).max(80),
    body: z.string().trim().max(600),
    linkLabel: z.string().trim().max(40),
    linkHref: internalHref.or(z.literal("")),
  }),
  "home.featured": z.object({
    /** Collection highlighted on the homepage ("featured edit"). */
    collectionSlug: z.string().trim().max(80).nullable(),
    occasionCollectionSlug: z.string().trim().max(80).nullable(),
  }),
  "department.women": z.object({
    headline: z.string().trim().min(1).max(80),
    body: z.string().trim().max(240),
    imageUrl: uploadUrl,
    imageAlt: z.string().trim().max(200),
  }),
  "department.men": z.object({
    headline: z.string().trim().min(1).max(80),
    body: z.string().trim().max(240),
    imageUrl: uploadUrl,
    imageAlt: z.string().trim().max(200),
  }),
} as const;

export type ContentKey = keyof typeof contentSchemas;
export type Content<K extends ContentKey> = z.infer<(typeof contentSchemas)[K]>;

export const contentDefaults: { [K in ContentKey]: Content<K> } = {
  "home.hero": {
    eyebrow: "Modern tradition",
    headline: "Wear Your Story",
    body: "Discover considered styles for everyday expression, celebrations, and the moments you want to remember.",
    primaryLabel: "Explore the Collection",
    primaryHref: "/collections",
    secondaryLabel: "Find Your Style",
    secondaryHref: "/shop",
    imageUrl: null,
    imageAlt: "",
    accents: [],
  },
  "home.announcement": { enabled: false, text: "", href: "" },
  "home.story": {
    eyebrow: "Babajan Sumangali",
    headline: "Tradition, styled for today",
    body: "We bring together considered fashion for women and men — pieces that respect cultural roots while feeling current, confident, and personal.",
    linkLabel: "About the brand",
    linkHref: "/about",
  },
  "home.featured": { collectionSlug: null, occasionCollectionSlug: null },
  "department.women": {
    headline: "Women",
    body: "Styles for celebrations, everyday elegance, and everything in between.",
    imageUrl: null,
    imageAlt: "",
  },
  "department.men": {
    headline: "Men",
    body: "Modern silhouettes and considered details for your next occasion.",
    imageUrl: null,
    imageAlt: "",
  },
};

export const getContent = cache(async <K extends ContentKey>(key: K): Promise<Content<K>> => {
  try {
    const [row] = await db.select().from(schema.contentBlock).where(eq(schema.contentBlock.key, key));
    if (!row) return contentDefaults[key];
    const parsed = contentSchemas[key].safeParse(row.data);
    return parsed.success ? (parsed.data as Content<K>) : contentDefaults[key];
  } catch {
    return contentDefaults[key];
  }
});

export async function saveContent<K extends ContentKey>(key: K, data: unknown, actorUserId: string) {
  const parsed = contentSchemas[key].parse(data);
  await db
    .insert(schema.contentBlock)
    .values({ key, data: parsed, updatedBy: actorUserId })
    .onConflictDoUpdate({ target: schema.contentBlock.key, set: { data: parsed, updatedBy: actorUserId, updatedAt: new Date() } });
  return parsed;
}
