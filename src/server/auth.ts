import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { emails, sendEmail } from "@/server/email";

function createAuth() {
  return betterAuth({
    appName: "Babajan Sumangali",
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    user: {
      additionalFields: {
        // `input: false` — clients can never set or change their own role.
        role: { type: "string", required: false, defaultValue: "customer", input: false },
        phone: { type: "string", required: false, input: true },
        marketingOptIn: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({ to: user.email, ...emails.resetPassword(user.name, url) });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({ to: user.email, ...emails.verifyEmail(user.name, url) });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14, // 14 days
      updateAge: 60 * 60 * 24, // refresh daily while active
      freshAge: 60 * 15,
    },
    rateLimit: {
      enabled: env.NODE_ENV !== "test",
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 300, max: 3 },
        "/forget-password": { window: 300, max: 3 },
        "/send-verification-email": { window: 300, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: env.APP_URL.startsWith("https://"),
      cookiePrefix: "bs",
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    },
    trustedOrigins: [env.APP_URL],
    telemetry: { enabled: false },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

/** Lazily constructed so builds don't require runtime secrets. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
