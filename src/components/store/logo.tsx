import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * The approved wordmark artwork (assets/name_logo.png → public/brand).
 * Navy/gold artwork: only place on white, ivory or very pale surfaces.
 * No reversed version has been supplied, so it is never placed on navy.
 * Intrinsic ratio of the trimmed artwork: 2054 × 533.
 */
export function Wordmark({ className, priority, width = 176 }: { className?: string; priority?: boolean; width?: number }) {
  return (
    <Image
      src="/brand/wordmark-960.png"
      alt="Babajan Sumangali"
      width={width}
      height={Math.round((width * 533) / 2054)}
      priority={priority}
      quality={90}
      className={cn("h-auto select-none", className)}
    />
  );
}

export function HomeLogoLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 py-2", className)} aria-label="Babajan Sumangali — home">
      <Wordmark priority className="w-[132px] sm:w-[160px] lg:w-[184px]" width={184} />
    </Link>
  );
}

/** Compact emblem (assets/standalone_logo.png) — favicon, seals and small marks only. */
export function Emblem({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/emblem-480.png"
      alt=""
      width={size}
      height={Math.round((size * 905) / 938)}
      quality={90}
      className={cn("h-auto select-none", className)}
    />
  );
}
