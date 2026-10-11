"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function NavLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex min-h-11 items-center px-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy transition-colors hover:text-blue",
        "after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-200",
        "hover:after:scale-x-100 aria-[current=page]:after:scale-x-100",
        className,
      )}
    >
      {children}
    </Link>
  );
}
