import { z } from "zod";

/**
 * Server-side environment, validated once. Never import this from client
 * components — none of these values may reach the browser bundle.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    AUTH_REQUIRE_EMAIL_VERIFICATION: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    PAYMENT_PROVIDER: z.enum(["razorpay", "test"]).default("test"),
    TEST_PAYMENT_WEBHOOK_SECRET: z.string().optional(),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    EMAIL_FROM: z.string().default("Babajan Sumangali <orders@example.com>"),
    RESEND_API_KEY: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    MAINTENANCE_MODE: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .superRefine((v, ctx) => {
    if (v.APP_ENV === "production" && v.PAYMENT_PROVIDER === "test") {
      ctx.addIssue({ code: "custom", path: ["PAYMENT_PROVIDER"], message: "The test payment adapter cannot run in production." });
    }
    if (v.PAYMENT_PROVIDER === "razorpay" && (!v.RAZORPAY_KEY_ID || !v.RAZORPAY_KEY_SECRET || !v.RAZORPAY_WEBHOOK_SECRET)) {
      ctx.addIssue({ code: "custom", path: ["RAZORPAY_KEY_ID"], message: "Razorpay requires RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET." });
    }
    if (v.PAYMENT_PROVIDER === "test" && !v.TEST_PAYMENT_WEBHOOK_SECRET) {
      ctx.addIssue({ code: "custom", path: ["TEST_PAYMENT_WEBHOOK_SECRET"], message: "TEST_PAYMENT_WEBHOOK_SECRET is required for the test payment adapter." });
    }
    if (v.EMAIL_PROVIDER === "resend" && !v.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend." });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;
function load(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const isBuildPhase =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.npm_lifecycle_event === "build" ||
      !process.env.DATABASE_URL ||
      !process.env.BETTER_AUTH_SECRET;

    if (isBuildPhase) {
      return {
        NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") ?? "production",
        APP_ENV: (process.env.APP_ENV as "development" | "staging" | "production") ?? "development",
        APP_URL: process.env.APP_URL ?? "http://localhost:3000",
        DATABASE_URL: process.env.DATABASE_URL ?? "postgres://dummy:dummy@localhost:5432/dummy",
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "dummy-secret-at-least-32-characters-long-for-build",
        AUTH_REQUIRE_EMAIL_VERIFICATION: false,
        PAYMENT_PROVIDER: "test",
        TEST_PAYMENT_WEBHOOK_SECRET: "dummy-test-payment-webhook-secret-build",
        EMAIL_PROVIDER: "console",
        EMAIL_FROM: "Babajan Sumangali <orders@example.com>",
        MAINTENANCE_MODE: false,
      };
    }

    const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

/** Lazily validated so that `next build` does not require runtime secrets. */
export const env = new Proxy({} as Env, { get: (_t, key: string) => load()[key as keyof Env] });

export const isProduction = () => env.APP_ENV === "production";
