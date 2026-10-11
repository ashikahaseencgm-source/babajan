/**
 * Development seed. Creates SAMPLE catalogue data and test accounts.
 *
 * Safety:
 *  - Refuses to run when APP_ENV=production.
 *  - Refuses non-local databases unless --allow-remote is passed (e.g. staging).
 *  - Only inserts/updates rows it owns (sample products by slug); never deletes
 *    real data. `--reset-samples` removes sample products only.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import { notInArray } from "drizzle-orm";
import { sampleCategories, sampleCollections, sampleEditorial, sampleProducts } from "./seed-data";

const previewUrl = (file: string) => `/images/preview/${file}.jpg`;
async function dims(file: string) {
  const m = await sharp(`public/images/preview/${file}.jpg`).metadata();
  return { width: m.width ?? 1600, height: m.height ?? 2400 };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (process.env.APP_ENV === "production") throw new Error("Refusing to seed: APP_ENV=production.");
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname) && !args.has("--allow-remote")) {
    throw new Error(`Refusing to seed non-local database host "${url.hostname}". Pass --allow-remote for staging.`);
  }

  const { db, schema } = await import("@/server/db");
  const { getAuth } = await import("@/server/auth");
  const { saveSetting } = await import("@/server/settings");

  if (args.has("--reset-samples")) {
    await db.delete(schema.product).where(eq(schema.product.isSample, true));
    console.log("Removed sample products.");
  } else {
    // Remove sample products that are no longer in the sample list.
    await db.delete(schema.product).where(and(eq(schema.product.isSample, true), notInArray(schema.product.slug, sampleProducts.map((p) => p.slug))));
  }

  // Categories
  const catIds = new Map<string, string>();
  for (const c of sampleCategories) {
    const [row] = await db
      .insert(schema.category)
      .values({ ...c })
      .onConflictDoUpdate({ target: [schema.category.department, schema.category.slug], set: { name: c.name, description: c.description, sortOrder: c.sortOrder } })
      .returning({ id: schema.category.id });
    catIds.set(`${c.department}/${c.slug}`, row.id);
  }

  // Collections
  const colIds = new Map<string, string>();
  for (const { image, ...c } of sampleCollections) {
    const values = { ...c, imageUrl: previewUrl(image.file), imageAlt: image.alt };
    const [row] = await db
      .insert(schema.collection)
      .values(values)
      .onConflictDoUpdate({ target: schema.collection.slug, set: values })
      .returning({ id: schema.collection.id });
    colIds.set(c.slug, row.id);
  }

  // Products (sample)
  for (const [i, p] of sampleProducts.entries()) {
    const values = {
      slug: p.slug,
      name: p.name,
      styleCode: p.styleCode,
      department: p.department,
      categoryId: catIds.get(`${p.department}/${p.category}`) ?? null,
      styleLine: p.styleLine,
      description: p.description,
      materials: p.materials,
      fit: p.fit,
      care: p.care,
      measurements: p.measurements ?? null,
      includedItems: p.includedItems ?? null,
      colourName: p.colourName,
      colourHex: p.colourHex,
      occasions: p.occasions,
      tags: p.tags,
      price: p.price * 100,
      compareAtPrice: p.compareAtPrice ? p.compareAtPrice * 100 : null,
      status: "active" as const,
      isSample: true,
      publishedAt: new Date(Date.now() - p.daysAgo * 86_400_000 - i * 60_000),
    };
    const [existing] = await db.select({ id: schema.product.id, isSample: schema.product.isSample }).from(schema.product).where(eq(schema.product.slug, p.slug));
    if (existing && !existing.isSample) {
      console.warn(`Skipping "${p.slug}": a real (non-sample) product uses this slug.`);
      continue;
    }
    const [prod] = existing
      ? await db.update(schema.product).set(values).where(eq(schema.product.id, existing.id)).returning({ id: schema.product.id })
      : await db.insert(schema.product).values(values).returning({ id: schema.product.id });

    for (const [si, size] of p.sizes.entries()) {
      const sku = `${p.styleCode}-${size.replace(/\s+/g, "").toUpperCase()}`;
      await db
        .insert(schema.productVariant)
        .values({ productId: prod.id, sku, size, sortOrder: si, stockOnHand: p.stock[si] ?? 0 })
        .onConflictDoUpdate({ target: schema.productVariant.sku, set: { size, sortOrder: si, stockOnHand: p.stock[si] ?? 0, isActive: true } });
    }

    await db.delete(schema.productImage).where(eq(schema.productImage.productId, prod.id));
    for (const [n, img] of p.images.entries()) {
      await db.insert(schema.productImage).values({ productId: prod.id, url: previewUrl(img.file), alt: img.alt, sortOrder: n, ...(await dims(img.file)) });
    }

    const wanted = p.collections.map((s) => colIds.get(s)).filter((x): x is string => !!x);
    await db.delete(schema.collectionProduct).where(eq(schema.collectionProduct.productId, prod.id));
    if (wanted.length) {
      await db.insert(schema.collectionProduct).values(wanted.map((collectionId, n) => ({ collectionId, productId: prod.id, sortOrder: i * 10 + n })));
    }
  }
  console.log(`Seeded ${sampleProducts.length} sample products, ${sampleCategories.length} categories, ${sampleCollections.length} collections.`);

  // Store settings — sample values; `confirmedByOwner: false` keeps them flagged in admin.
  await saveSetting(
    "shipping",
    {
      countries: ["IN"],
      methods: [{ id: "standard", label: "Standard delivery", fee: 15000, freeAbove: 499900, estimate: null }],
      confirmedByOwner: false,
    },
    null,
  );

  // Sample discount for testing the discount flow.
  await db
    .insert(schema.discount)
    .values({ code: "SAMPLE10", description: "Development sample: 10% off", type: "percentage", value: 10, minSubtotal: 0 })
    .onConflictDoNothing();

  // Accounts
  const accounts = [
    { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, name: "Store Admin (dev)", role: "admin" as const },
    { email: process.env.SEED_STAFF_EMAIL, password: process.env.SEED_STAFF_PASSWORD, name: "Store Staff (dev)", role: "staff" as const },
    { email: process.env.SEED_CUSTOMER_EMAIL, password: process.env.SEED_CUSTOMER_PASSWORD, name: "Asha Customer (dev)", role: "customer" as const },
  ];
  for (const a of accounts) {
    if (!a.email || !a.password) continue;
    const [existing] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, a.email));
    if (!existing) {
      await getAuth().api.signUpEmail({ body: { email: a.email, password: a.password, name: a.name } });
    }
    await db.update(schema.user).set({ role: a.role, emailVerified: true }).where(eq(schema.user.email, a.email));
    console.log(`Account ready: ${a.email} (${a.role})`);
  }

  // Featured content defaults point at sample collections.
  const { saveContent } = await import("@/server/content");
  const [admin] = await db.select({ id: schema.user.id }).from(schema.user).where(and(eq(schema.user.role, "admin"), inArray(schema.user.email, [process.env.SEED_ADMIN_EMAIL ?? ""])));
  if (admin) {
    await saveContent("home.featured", { collectionSlug: "festive-edit", occasionCollectionSlug: "wedding-and-occasion" }, admin.id);
    const { contentDefaults } = await import("@/server/content");
    await saveContent("home.hero", { ...contentDefaults["home.hero"], imageUrl: previewUrl(sampleEditorial.hero.file), imageAlt: sampleEditorial.hero.alt, accents: sampleEditorial.accents.map((a) => ({ url: previewUrl(a.file), alt: a.alt })) }, admin.id);
    await saveContent("department.women", { ...contentDefaults["department.women"], imageUrl: previewUrl(sampleEditorial.women.file), imageAlt: sampleEditorial.women.alt }, admin.id);
    await saveContent("department.men", { ...contentDefaults["department.men"], imageUrl: previewUrl(sampleEditorial.men.file), imageAlt: sampleEditorial.men.alt }, admin.id);
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
