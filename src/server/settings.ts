import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cache } from "react";
import { db, schema } from "@/server/db";

/**
 * Store settings, edited by admins in /admin/settings. Every value is
 * validated on read and write. Defaults are deliberately conservative and are
 * flagged as "unconfirmed" until the owner reviews them.
 */

const paise = z.number().int().min(0).max(100_000_000);

export const shippingSettingsSchema = z.object({
  /** ISO country codes the store ships to. */
  countries: z.array(z.string().length(2)).min(1),
  methods: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        label: z.string().min(1).max(60),
        fee: paise,
        freeAbove: paise.nullable(),
        /** e.g. "3–7 business days". Shown only when set by the owner. */
        estimate: z.string().max(80).nullable(),
      }),
    )
    .min(1),
  confirmedByOwner: z.boolean(),
});

export const taxSettingsSchema = z.object({
  pricesIncludeTax: z.boolean(),
  rateBps: z.number().int().min(0).max(5000),
  confirmedByOwner: z.boolean(),
});

export const returnsSettingsSchema = z.object({
  acceptsReturns: z.boolean(),
  windowDays: z.number().int().min(0).max(365).nullable(),
  confirmedByOwner: z.boolean(),
});

export const contactSettingsSchema = z.object({
  email: z.string().email().nullable(),
  phone: z.string().max(30).nullable(),
  whatsapp: z.string().max(30).nullable(),
  address: z.string().max(300).nullable(),
  hours: z.string().max(120).nullable(),
  instagramUrl: z.string().url().startsWith("https://").nullable(),
  facebookUrl: z.string().url().startsWith("https://").nullable(),
});

export const policySettingsSchema = z.object({
  shipping: z.boolean(),
  returns: z.boolean(),
  privacy: z.boolean(),
  terms: z.boolean(),
  cookies: z.boolean(),
});

export const checkoutSettingsSchema = z.object({
  /** Minutes stock is held for an unpaid order. */
  reservationMinutes: z.number().int().min(5).max(120),
});

const settingSchemas = {
  shipping: shippingSettingsSchema,
  tax: taxSettingsSchema,
  returns: returnsSettingsSchema,
  contact: contactSettingsSchema,
  policies: policySettingsSchema,
  checkout: checkoutSettingsSchema,
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type Settings = { [K in SettingKey]: z.infer<(typeof settingSchemas)[K]> };

export const defaultSettings: Settings = {
  shipping: {
    countries: ["IN"],
    methods: [{ id: "standard", label: "Standard delivery", fee: 0, freeAbove: null, estimate: null }],
    confirmedByOwner: false,
  },
  tax: { pricesIncludeTax: true, rateBps: 0, confirmedByOwner: false },
  returns: { acceptsReturns: false, windowDays: null, confirmedByOwner: false },
  contact: { email: null, phone: null, whatsapp: null, address: null, hours: null, instagramUrl: null, facebookUrl: null },
  policies: { shipping: false, returns: false, privacy: false, terms: false, cookies: false },
  checkout: { reservationMinutes: 30 },
};

export function validateSetting<K extends SettingKey>(key: K, value: unknown): Settings[K] {
  return settingSchemas[key].parse(value) as Settings[K];
}

export const getSettings = cache(async (): Promise<Settings> => {
  const out = structuredClone(defaultSettings);
  try {
    const rows = await db.select().from(schema.storeSetting);
    for (const row of rows) {
      const key = row.key as SettingKey;
      if (!(key in settingSchemas)) continue;
      const parsed = settingSchemas[key].safeParse(row.value);
      if (parsed.success) (out as Record<string, unknown>)[key] = parsed.data;
      else console.error(`[settings] Ignoring invalid stored value for "${key}"`);
    }
  } catch {
    // DB unreachable during build or cold start, fallback to defaultSettings
  }
  return out;
});

export async function saveSetting<K extends SettingKey>(key: K, value: unknown, actorUserId: string | null) {
  const parsed = validateSetting(key, value);
  await db
    .insert(schema.storeSetting)
    .values({ key, value: parsed, updatedBy: actorUserId })
    .onConflictDoUpdate({ target: schema.storeSetting.key, set: { value: parsed, updatedBy: actorUserId, updatedAt: new Date() } });
  return parsed;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  try {
    const [row] = await db.select().from(schema.storeSetting).where(eq(schema.storeSetting.key, key));
    if (!row) return defaultSettings[key];
    const parsed = settingSchemas[key].safeParse(row.value);
    return parsed.success ? (parsed.data as Settings[K]) : defaultSettings[key];
  } catch {
    return defaultSettings[key];
  }
}
