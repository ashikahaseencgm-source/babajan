import Image from "next/image";
import type { ReactNode } from "react";
import { ArchReveal, SplitWords } from "@/components/motion/primitives";

export function AuthShell({ title, intro, children, image }: { title: string; intro?: ReactNode; children: ReactNode; image?: { url: string; alt: string } }) {
  return (
    <div className="container-bs grid min-h-[70vh] items-center gap-12 py-12 lg:grid-cols-[1fr_1fr] lg:py-16">
      <div className="mx-auto w-full max-w-md lg:mx-0">
        <SplitWords as="h1" text={title} className="t-page" onView={false} />
        {intro ? <div className="mt-3 text-slate">{intro}</div> : null}
        <div className="mt-8">{children}</div>
      </div>
      <div className="hidden justify-center lg:flex">
        <ArchReveal className="aspect-[4/5] w-full max-w-md bg-soft">
          {image ? <Image src={image.url} alt={image.alt} fill sizes="28rem" className="object-cover" priority /> : <div className="absolute inset-0 bg-navy" />}
        </ArchReveal>
      </div>
    </div>
  );
}
