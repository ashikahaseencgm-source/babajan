import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "link" | "danger" | "inverse";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-semibold tracking-[0.08em] uppercase text-[0.75rem] " +
  "rounded-sm transition-colors duration-150 ease-[var(--ease-quiet)] select-none text-center " +
  "disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy-deep active:bg-navy-deep",
  secondary: "border border-navy text-navy bg-transparent hover:bg-soft/60",
  ghost: "text-navy hover:bg-soft/50",
  link: "text-blue underline underline-offset-4 decoration-1 normal-case tracking-normal font-medium text-sm hover:text-navy",
  danger: "bg-error text-white hover:bg-[#8a2424]",
  inverse: "bg-ivory text-navy hover:bg-white",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4",
  md: "min-h-11 px-6",
  lg: "min-h-12 px-8 text-[0.8125rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], variant === "link" ? "min-h-11 px-0" : sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; pending?: boolean; children: ReactNode };

export function Button({ variant = "primary", size = "md", pending, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || pending} aria-busy={pending || undefined} {...rest}>
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant = "primary", size = "md", className, ...rest }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
