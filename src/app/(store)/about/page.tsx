import type { Metadata } from "next";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import { ArchReveal, ChapterMark, DrawThread, Parallax, Reveal, ScrollWords, SplitWords } from "@/components/motion/primitives";
import { Emblem } from "@/components/store/logo";

export const metadata: Metadata = {
  title: "About the Brand",
  description: "Babajan Sumangali brings together considered fashion for women and men — pieces that respect cultural roots while feeling current, confident, and personal.",
  alternates: { canonical: "/about" },
};

/*
 * Content note: this page uses only the approved brand positioning from the
 * brand guidelines (proposition, essence, values). It deliberately makes no
 * claims about founding history, artisans, sourcing or manufacturing. Add
 * those only once the owner has supplied and verified them.
 */
const values = [
  { title: "Elegance", body: "Refined rather than flashy." },
  { title: "Cultural connection", body: "Respectful of heritage and the occasions that matter." },
  { title: "Inclusivity", body: "Fashion for women and men, with room for every taste and life stage." },
  { title: "Personal expression", body: "Pieces that reflect who you are." },
  { title: "Trust", body: "Clear product information, honest imagery, transparent pricing." },
  { title: "Modernity", body: "A contemporary experience that keeps a boutique's warmth." },
];

export default function AboutPage() {
  return (
    <>
      <section className="container-bs grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-24">
        <div>
          <ChapterMark index="I" label="Babajan Sumangali" />
          <SplitWords as="h1" text="Wear Your Story" className="t-hero mt-6" onView={false} delay={0.2} />
          <DrawThread className="my-8 max-w-48" />
          <Reveal delay={0.3}>
            <p className="max-w-lg text-[1.125rem] leading-relaxed text-charcoal">
              Babajan Sumangali brings together considered fashion for women and men: pieces that respect cultural roots while feeling current, confident, and personal.
            </p>
          </Reveal>
        </div>
        <ArchReveal className="mx-auto aspect-[4/5] w-full max-w-md bg-soft">
          <Image src="/images/preview/ed-couple-dance.jpg" alt="A couple in festive attire dancing together" fill priority sizes="(min-width: 1024px) 28rem, 92vw" className="object-cover" />
        </ArchReveal>
      </section>

      <section className="on-dark bg-navy py-24 text-center lg:py-32" aria-labelledby="essence">
        <div className="container-bs">
          <div className="flex justify-center">
            <ChapterMark index="II" label="Our essence" tone="dark" />
          </div>
          <h2 id="essence" className="sr-only">
            Our essence
          </h2>
          <div className="mx-auto mt-10 max-w-4xl space-y-2 font-display text-[clamp(2rem,1.4rem+3vw,4.25rem)] leading-[1.1] text-ivory">
            {["Modern tradition.", "Personal expression.", "Considered elegance."].map((line, i) => (
              <Reveal key={line} delay={i * 0.18} y={40}>
                <p className={i === 1 ? "italic text-gold" : undefined}>{line}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-bs py-24 lg:py-32" aria-labelledby="values">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.3fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <ChapterMark index="III" label="What guides us" />
            <h2 id="values" className="t-page mt-5">
              Our values
            </h2>
            <ScrollWords
              text="Every piece should help you express your story with confidence — and every detail on this site should help you choose with confidence, too."
              className="mt-6 max-w-md font-display text-2xl leading-snug text-navy"
            />
          </div>
          <ol className="divide-y divide-mist border-y border-mist">
            {values.map((v, i) => (
              <Reveal as="li" key={v.title} className="grid grid-cols-[3rem_1fr] gap-4 py-7" delay={0.05 * i}>
                <span className="font-display text-2xl italic text-gold" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-2xl text-navy">{v.title}</h3>
                  <p className="mt-1 text-slate">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section aria-label="Women and men" className="grid sm:grid-cols-2">
        <Parallax className="aspect-[4/5] sm:aspect-auto sm:h-[80svh]" amount={10}>
          <Image src="/images/preview/w-lehenga-pink.jpg" alt="Woman in a fuchsia lehenga" fill sizes="50vw" className="object-cover" />
        </Parallax>
        <Parallax className="aspect-[4/5] sm:aspect-auto sm:h-[80svh]" amount={14}>
          <Image src="/images/preview/m-sherwani-red.jpg" alt="Man in a crimson sherwani" fill sizes="50vw" className="object-cover" />
        </Parallax>
      </section>

      <section className="container-bs py-24 text-center" aria-labelledby="cta">
        <Reveal>
          <Emblem size={64} className="mx-auto w-16" />
          <h2 id="cta" className="t-page mt-6">
            Find the piece that feels like you
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href="/women">Shop Women</LinkButton>
            <LinkButton href="/men">Shop Men</LinkButton>
          </div>
        </Reveal>
      </section>
    </>
  );
}
