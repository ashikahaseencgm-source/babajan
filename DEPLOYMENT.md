# Vercel Deployment Guide

This project is fully configured and ready for deployment to **Vercel**.

---

## 1. Push to GitHub

From the root of this project:

```bash
git add .
git commit -m "feat: configure project for Vercel deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

---

## 2. Deploy to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`ashika_store`).
4. Framework Preset will be automatically detected as **Next.js**.
5. Root Directory: `./` (leave default).

---

## 3. Environment Variables (Required in Vercel)

Go to **Project Settings** → **Environment Variables** and add the following:

| Variable | Description | Example / Recommendation |
|---|---|---|
| `APP_URL` | Public URL of your deployed application | `https://your-domain.vercel.app` |
| `APP_ENV` | Deployment environment | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@ep-host.region.neon.tech/dbname?sslmode=require` (e.g. Neon, Supabase, Vercel Postgres) |
| `BETTER_AUTH_SECRET` | Secret key for auth sessions (min 32 chars) | Generate with `openssl rand -base64 32` |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | Email verification required | `false` (or `true` if Resend configured) |
| `PAYMENT_PROVIDER` | Payment gateway | `razorpay` (or `test` for staging) |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_test_...` or `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | Your secret key |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret | Webhook signature secret |
| `EMAIL_PROVIDER` | Email driver | `resend` or `console` |
| `RESEND_API_KEY` | Resend API key | Required if `EMAIL_PROVIDER=resend` |
| `CRON_SECRET` | Secret token for /api/cron endpoints | Random string |

---

## 4. Run Database Migrations

Before launching traffic, apply the Drizzle schema migrations to your production database:

```bash
DATABASE_URL="your-production-db-url" npm run db:migrate
```

To seed the initial data:
```bash
DATABASE_URL="your-production-db-url" npm run db:seed
```
