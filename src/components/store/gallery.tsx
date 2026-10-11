"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { PlaceholderArt } from "./product-media";
import { cn } from "@/lib/cn";

type Img = { id: string; url: string; alt: string; width: number; height: number };

/**
 * Accessible product gallery: thumbnail buttons, previous/next controls,
 * swipeable on touch (scroll-snap), and a full-screen zoom dialog.
 */
export function Gallery({ images, name, colourHex, colourName }: { images: Img[]; name: string; colourHex: string | null; colourName: string | null }) {
  const [index, setIndex] = useState(0);
  const zoomRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[3/4] overflow-hidden rounded-xs">
        <PlaceholderArt name={name} colourHex={colourHex} colourName={colourName} />
      </div>
    );
  }

  const go = (i: number) => {
    const next = (i + images.length) % images.length;
    setIndex(next);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
  };

  const current = images[index];

  return (
    <div className="lg:grid lg:grid-cols-[4.5rem_1fr] lg:gap-4">
      {images.length > 1 ? (
        <ul className="order-2 mt-3 flex gap-2 overflow-x-auto lg:order-none lg:mt-0 lg:flex-col" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === index ? "true" : undefined}
                className={cn("relative block aspect-[3/4] w-16 overflow-hidden rounded-xs border bg-white lg:w-[4.5rem]", i === index ? "border-navy" : "border-mist hover:border-slate-muted")}
              >
                <Image src={img.url} alt="" fill sizes="72px" className="object-cover" />
                <span className="sr-only">
                  Show image {i + 1} of {images.length}: {img.alt}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== index && i >= 0 && i < images.length) setIndex(i);
          }}
          aria-roledescription="carousel"
          aria-label={`${name} images`}
        >
          {images.map((img, i) => (
            <div key={img.id} className="relative aspect-[3/4] w-full shrink-0 snap-center bg-ivory" aria-hidden={i !== index}>
              <Image
                src={img.url}
                alt={img.alt}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
                quality={85}
                className="object-cover mix-blend-multiply"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => zoomRef.current?.showModal()}
          className="absolute bottom-3 right-3 inline-flex size-11 items-center justify-center rounded-full bg-white/90 text-navy shadow-soft hover:bg-white"
        >
          <Maximize2 className="size-4" aria-hidden="true" />
          <span className="sr-only">Zoom image</span>
        </button>

        {images.length > 1 ? (
          <>
            <button type="button" onClick={() => go(index - 1)} className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow-soft hover:bg-white md:inline-flex">
              <ChevronLeft className="size-5" aria-hidden="true" />
              <span className="sr-only">Previous image</span>
            </button>
            <button type="button" onClick={() => go(index + 1)} className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow-soft hover:bg-white md:inline-flex">
              <ChevronRight className="size-5" aria-hidden="true" />
              <span className="sr-only">Next image</span>
            </button>
            <p className="sr-only" aria-live="polite">
              Image {index + 1} of {images.length}
            </p>
            <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
              {images.map((img, i) => (
                <span key={img.id} className={cn("h-1 rounded-full transition-all", i === index ? "w-6 bg-navy" : "w-1.5 bg-mist")} />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <dialog
        ref={zoomRef}
        aria-label={`Zoomed image: ${current.alt}`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-white p-0 backdrop:bg-black/70"
        onClick={(e) => {
          if (e.target === zoomRef.current) zoomRef.current?.close();
        }}
      >
        <div className="relative h-full w-full overflow-auto">
          <Image src={current.url} alt={current.alt} width={current.width} height={current.height} sizes="100vw" quality={90} className="mx-auto h-auto w-full max-w-[1600px]" />
        </div>
        <button type="button" onClick={() => zoomRef.current?.close()} autoFocus className="fixed right-4 top-4 inline-flex size-11 items-center justify-center rounded-full bg-white text-navy shadow-lift">
          <X className="size-5" aria-hidden="true" />
          <span className="sr-only">Close zoom</span>
        </button>
      </dialog>
    </div>
  );
}
