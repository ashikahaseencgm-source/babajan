import Link from "next/link";
import { ChevronRight, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/* ── Alert ───────────────────────────────────────────────────────────── */

type Tone = "info" | "success" | "warning" | "error";
const toneStyles: Record<Tone, string> = {
  info: "border-soft bg-soft/50 text-navy",
  success: "border-success/30 bg-[#eef6f0] text-success",
  warning: "border-gold/60 bg-warn text-charcoal",
  error: "border-error/30 bg-[#fbeeee] text-error",
};
const toneIcons: Record<Tone, typeof Info> = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };
const toneLabels: Record<Tone, string> = { info: "Note", success: "Success", warning: "Please note", error: "Error" };

export function Alert({ tone = "info", title, children, className, live }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string; live?: boolean }) {
  const Icon = toneIcons[tone];
  return (
    <div
      className={cn("flex gap-3 rounded-sm border px-4 py-3 text-sm leading-relaxed", toneStyles[tone], className)}
      role={live ? (tone === "error" ? "alert" : "status") : undefined}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
      <div className="min-w-0">
        <span className="sr-only">{toneLabels[tone]}: </span>
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", tone !== "error" && tone !== "success" && "text-charcoal")}>{children}</div> : null}
      </div>
    </div>
  );
}

/* ── Badge ───────────────────────────────────────────────────────────── */

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "navy" | "sale" | "muted" | "success" | "warning" | "error"; className?: string }) {
  const tones = {
    neutral: "bg-white text-navy border border-mist",
    navy: "bg-navy text-white",
    sale: "bg-ivory text-navy border border-gold",
    muted: "bg-ivory text-slate border border-mist",
    success: "bg-[#eef6f0] text-success border border-success/25",
    warning: "bg-warn text-charcoal border border-gold/50",
    error: "bg-[#fbeeee] text-error border border-error/25",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em]", tones[tone], className)}>
      {children}
    </span>
  );
}

/* ── Breadcrumbs ─────────────────────────────────────────────────────── */

export type Crumb = { name: string; href?: string };

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[0.8125rem] text-slate", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.name}-${i}`} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="underline-offset-4 hover:text-navy hover:underline">
                  {c.name}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-navy" : undefined}>
                  {c.name}
                </span>
              )}
              {!last ? <ChevronRight className="size-3 text-slate-muted" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── Section heading ─────────────────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  as: As = "h2",
  className,
  id,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between", className)}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? <p className="t-eyebrow mb-3">{eyebrow}</p> : null}
        <As id={id} className={As === "h1" ? "t-page" : "t-section"}>
          {title}
        </As>
        {description ? <p className="mt-3 text-slate">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ── Thread divider (decorative) ─────────────────────────────────────── */

export function Thread({ className }: { className?: string }) {
  return (
    <div className={cn("thread", className)} aria-hidden="true">
      <span />
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────── */

export function EmptyState({ title, children, actions, className }: { title: ReactNode; children?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center", className)}>
      <ArchMark className="mb-6 h-16 w-12 text-gold" />
      <h2 className="t-card">{title}</h2>
      {children ? <div className="mt-3 text-slate">{children}</div> : null}
      {actions ? <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}

/** Simplified arch silhouette — decorative brand motif. */
export function ArchMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 64" className={className} fill="none" aria-hidden="true">
      <path d="M4 63V24C4 12.95 12.95 4 24 4s20 8.95 20 20v39" stroke="currentColor" strokeWidth="1.25" />
      <path d="M11 63V25c0-7.18 5.82-13 13-13s13 5.82 13 13v38" stroke="currentColor" strokeWidth="0.75" opacity="0.7" />
      <path d="M24 0l2.5 2.5L24 5l-2.5-2.5z" fill="currentColor" />
    </svg>
  );
}

/* ── Pagination ──────────────────────────────────────────────────────── */

export function Pagination({ page, pageCount, hrefFor, className }: { page: number; pageCount: number; hrefFor: (p: number) => string; className?: string }) {
  if (pageCount <= 1) return null;
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  const item = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-3 text-sm";
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1", className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(item, "text-navy hover:bg-soft/60")} rel="prev">
          Previous
        </Link>
      ) : null}
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - sorted[i - 1] > 1 ? <span className="px-1 text-slate" aria-hidden="true">…</span> : null}
          {p === page ? (
            <span aria-current="page" className={cn(item, "bg-navy font-semibold text-white")}>
              <span className="sr-only">Page </span>
              {p}
            </span>
          ) : (
            <Link href={hrefFor(p)} className={cn(item, "text-navy hover:bg-soft/60")}>
              <span className="sr-only">Page </span>
              {p}
            </Link>
          )}
        </span>
      ))}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(item, "text-navy hover:bg-soft/60")} rel="next">
          Next
        </Link>
      ) : null}
    </nav>
  );
}
