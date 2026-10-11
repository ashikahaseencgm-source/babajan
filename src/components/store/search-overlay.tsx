"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Spinner } from "@/components/ui/button";

type Suggestion = { slug: string; name: string; price: number; categoryName: string | null };

/**
 * Search dialog with an ARIA combobox: type to see suggestions, arrow keys to
 * move, Enter to open a suggestion or run a full search. Nothing is stored
 * locally (no recent-search history) for privacy.
 */
export function SearchOverlay() {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    ref.current?.close();
  }, [pathname]);

  useEffect(() => {
    const term = q.trim();
    // Short terms show no list (see `showList`); nothing to fetch.
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { items: Suggestion[] };
        setItems(data.items);
        setActive(-1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function open() {
    ref.current?.showModal();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && items[active]) {
      router.push(`/products/${items[active].slug}`);
      return;
    }
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    }
  }

  const showList = q.trim().length >= 2;

  return (
    <>
      <button type="button" onClick={open} className="inline-flex size-11 items-center justify-center rounded-sm text-navy hover:bg-soft/50" aria-haspopup="dialog">
        <Search className="size-5" strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">Search</span>
      </button>
      <dialog
        ref={ref}
        aria-label="Search the store"
        className="mx-auto mt-0 w-full max-w-none bg-ivory p-0 backdrop:bg-navy/40 open:animate-[fade-in_200ms_var(--ease-quiet)]"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="container-bs py-5 lg:py-8">
          <form role="search" onSubmit={submit} className="flex items-center gap-3">
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-0 top-1/2 size-5 -translate-y-1/2 text-slate" strokeWidth={1.5} aria-hidden="true" />
              <input
                ref={inputRef}
                id="site-search"
                type="search"
                role="combobox"
                aria-expanded={showList && items.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                autoComplete="off"
                enterKeyHint="search"
                placeholder="Search by name, style, colour or occasion"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                maxLength={100}
                className="min-h-12 w-full border-0 border-b border-navy/30 bg-transparent pl-8 font-display text-2xl text-navy placeholder:text-slate/70 focus-visible:border-navy focus-visible:outline-none lg:text-3xl"
              />
            </div>
            <button type="button" onClick={() => ref.current?.close()} className="inline-flex size-11 items-center justify-center rounded-sm text-navy hover:bg-soft/50">
              <X className="size-6" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">Close search</span>
            </button>
          </form>

          <div className="mt-4 min-h-6" aria-live="polite">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-slate">
                <Spinner /> Searching…
              </p>
            ) : error ? (
              <p className="text-sm text-error">Search is unavailable right now. Press Enter to try the full search.</p>
            ) : showList && items.length === 0 ? (
              <p className="text-sm text-slate">No quick matches. Press Enter to search everything, or explore the collections.</p>
            ) : null}
          </div>

          <ul id={listId} role="listbox" aria-label="Suggestions" className="divide-y divide-mist">
            {showList &&
              items.map((s, i) => (
                <li key={s.slug} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                  <Link
                    href={`/products/${s.slug}`}
                    tabIndex={-1}
                    className={`flex min-h-12 items-center justify-between gap-4 px-2 py-2.5 ${i === active ? "bg-soft/60" : "hover:bg-soft/40"}`}
                  >
                    <span>
                      <span className="block text-[0.9375rem] text-charcoal">{s.name}</span>
                      {s.categoryName ? <span className="text-[0.8125rem] text-slate">{s.categoryName}</span> : null}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-navy">{formatMoney(s.price)}</span>
                  </Link>
                </li>
              ))}
          </ul>

          {!showList ? (
            <div className="flex flex-wrap gap-2 pb-2 text-sm">
              <span className="sr-only">Popular destinations:</span>
              {[
                ["Women", "/women"],
                ["Men", "/men"],
                ["New Arrivals", "/new-arrivals"],
                ["Collections", "/collections"],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="inline-flex min-h-10 items-center rounded-sm border border-mist bg-white px-4 text-navy hover:border-navy">
                  {label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
