import { z } from "zod";
import { INDIAN_MOBILE_RE, INDIAN_STATES, PIN_CODE_RE } from "@/lib/india";

/** Shared, client-safe validation schemas (also enforced on the server). */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Please enter a valid email address.");

export const phoneSchema = z.string().trim().regex(INDIAN_MOBILE_RE, "Please enter a valid 10-digit mobile number.");

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter the recipient's full name.").max(100),
  phone: phoneSchema,
  line1: z.string().trim().min(3, "Please enter the house number and street.").max(150),
  line2: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((v) => v || null),
  city: z.string().trim().min(2, "Please enter the city.").max(80),
  state: z.enum(INDIAN_STATES, { error: "Please choose a state." }),
  postalCode: z.string().trim().regex(PIN_CODE_RE, "Please enter a valid 6-digit PIN code."),
  country: z.literal("IN").default("IN"),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  address: addressSchema,
  shippingMethodId: z.string().min(1).max(40),
  customerNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),
  checkoutKey: z.string().uuid(),
  expectedTotal: z.coerce.number().int().min(0),
  saveAddress: z.boolean().default(false),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use at most 128 characters.");

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: emailSchema,
  orderNumber: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => v || null),
  topic: z.enum(["order", "sizing", "product", "returns", "other"], { error: "Please choose a topic." }),
  message: z.string().trim().min(10, "Please tell us a little more (at least 10 characters).").max(3000),
});

/** Flattens zod errors into { "address.city": "message" } for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
