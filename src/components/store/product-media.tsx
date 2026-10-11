import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Product imagery. All product images use a 3:4 portrait ratio so grids stay
 * aligned and layout never shifts (width/height are always known).
 *
 * When no photograph has been uploaded yet we show an honest, branded
 * placeholder — never a stock or generated garment image.
 */
export function ProductMedia({
  image,
  name,
  colourHex,
  colourName,
  sizes,
  priority,
  className,
}: {
  image: { url: string; alt: string } | null;
  name: string;
  colourHex?: string | null;
  colourName?: string | null;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-[3/4] overflow-hidden bg-ivory", className)}>
      {image ? (
        <Image
          src={image.url}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          quality={80}
          className="object-cover mix-blend-multiply transition-transform duration-700 ease-[var(--ease-quiet)] group-hover:scale-[1.04]"
        />
      ) : (
        <PlaceholderArt name={name} colourHex={colourHex} colourName={colourName} />
      )}
    </div>
  );
}

export function PlaceholderArt({ name, colourHex, colourName, compact }: { name: string; colourHex?: string | null; colourName?: string | null; compact?: boolean }) {
  const tone = colourHex && /^#[0-9a-f]{6}$/i.test(colourHex) ? colourHex : "#1E5A9B";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ivory" role="img" aria-label={`${name}${colourName ? ` in ${colourName}` : ""} — photograph coming soon`}>
      <svg viewBox="0 0 300 400" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id="weave" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 6h12" stroke="#0F2D4F" strokeOpacity="0.035" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="300" height="400" fill="url(#weave)" />
        <path d="M70 340V170c0-44 36-80 80-80s80 36 80 80v170" fill={tone} fillOpacity="0.14" stroke={tone} strokeOpacity="0.55" strokeWidth="1.25" />
        <path d="M88 340V174c0-34 28-62 62-62s62 28 62 62v166" fill="none" stroke="#C9A96A" strokeWidth="0.9" />
        <path d="M150 78l4 4-4 4-4-4z" fill="#C9A96A" />
        <path d="M58 340h184" stroke="#C9A96A" strokeWidth="0.9" />
      </svg>
      {!compact ? (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xs bg-white/90 px-2.5 py-1 text-[0.6875rem] font-medium tracking-[0.06em] text-slate">
          Photograph coming soon
        </span>
      ) : null}
    </div>
  );
}
