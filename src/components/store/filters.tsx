"use client";

import Form from "next/form";
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { sortOptions, type Facets, type SortKey } from "@/server/catalog-shared";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Selected = {
  sizes: string[];
  colours: string[];
  occasions: string[];
  categories: string[];
  min: string;
  max: string;
  inStockOnly: boolean;
  sort: SortKey;
};

/**
 * One GET form drives filtering and sorting (works without JavaScript).
 * Desktop: persistent sidebar that applies on change. Mobile: a full-screen
 * panel with an explicit "Show results" action.
 */
export function FilterPanel({
  path,
  facets,
  selected,
  keep,
  resultCount,
  activeCount,
}: {
  path: string;
  facets: Facets;
  selected: Selected;
  keep: Record<string, string>;
  resultCount: number;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("button, input, select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && panel) {
        const focusables = panel.querySelectorAll<HTMLElement>("button, input, select, a[href]");
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  const autoSubmit = () => {
    if (isDesktop) formRef.current?.requestSubmit();
  };

  const groupTitle = "mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy";

  return (
    <>
      <div className="mb-6 flex items-center gap-3 lg:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="filter-panel"
          className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-navy px-4 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-navy"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filter &amp; sort{activeCount ? ` (${activeCount})` : ""}
        </button>
      </div>

      <div
        id="filter-panel"
        ref={panelRef}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label={open ? "Filter and sort" : undefined}
        className={cn(
          "lg:sticky lg:top-28 lg:block lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:pb-8 lg:pr-2",
          open ? "fixed inset-0 z-50 flex flex-col bg-ivory" : "hidden",
        )}
      >
        {open ? (
          <div className="flex items-center justify-between border-b border-mist px-4 py-2">
            <p className="font-display text-2xl text-navy">Filter &amp; sort</p>
            <button type="button" onClick={close} className="inline-flex size-11 items-center justify-center text-navy">
              <X className="size-6" aria-hidden="true" />
              <span className="sr-only">Close filters</span>
            </button>
          </div>
        ) : null}

        <Form ref={formRef} action={path} className={cn("space-y-8", open && "flex-1 overflow-y-auto px-5 py-6")} onSubmit={() => open && setOpen(false)}>
          {Object.entries(keep).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}

          <div>
            <label htmlFor="sort" className={cn(groupTitle, "block")}>
              Sort by
            </label>
            <select id="sort" name="sort" defaultValue={selected.sort} onChange={autoSubmit} className={cn(inputClass, "text-sm")}>
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {facets.categories.length > 1 ? (
            <fieldset>
              <legend className={groupTitle}>Category</legend>
              <div className="space-y-0.5">
                {facets.categories.map((c) => (
                  <CheckRow key={c.slug} name="category" value={c.slug} label={c.name} checked={selected.categories.includes(c.slug)} onChange={autoSubmit} />
                ))}
              </div>
            </fieldset>
          ) : null}

          {facets.sizes.length ? (
            <fieldset>
              <legend className={groupTitle}>Size</legend>
              <div className="flex flex-wrap gap-2">
                {facets.sizes.map((s) => (
                  <label key={s} className="relative">
                    <input type="checkbox" name="size" value={s} defaultChecked={selected.sizes.includes(s)} onChange={autoSubmit} className="peer sr-only" />
                    <span className="inline-flex min-h-10 min-w-11 cursor-pointer items-center justify-center rounded-sm border border-mist bg-white px-3 text-sm text-charcoal transition-colors peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue hover:border-navy">
                      {s}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {facets.colours.length ? (
            <fieldset>
              <legend className={groupTitle}>Colour</legend>
              <div className="space-y-0.5">
                {facets.colours.map((c) => (
                  <CheckRow
                    key={c.name}
                    name="colour"
                    value={c.name}
                    checked={selected.colours.includes(c.name)}
                    onChange={autoSubmit}
                    label={
                      <span className="flex items-center gap-2">
                        <span className="size-3.5 rounded-full border border-black/15" style={{ background: c.hex ?? "transparent" }} aria-hidden="true" />
                        {c.name}
                      </span>
                    }
                  />
                ))}
              </div>
            </fieldset>
          ) : null}

          {facets.occasions.length ? (
            <fieldset>
              <legend className={groupTitle}>Occasion</legend>
              <div className="space-y-0.5">
                {facets.occasions.map((o) => (
                  <CheckRow key={o} name="occasion" value={o} label={o} checked={selected.occasions.includes(o)} onChange={autoSubmit} />
                ))}
              </div>
            </fieldset>
          ) : null}

          {facets.price ? (
            <fieldset>
              <legend className={groupTitle}>Price (₹)</legend>
              <div className="flex items-center gap-2">
                <label className="flex-1">
                  <span className="sr-only">Minimum price in rupees</span>
                  <input name="min" inputMode="numeric" pattern="[0-9]*" placeholder={String(Math.floor(facets.price.min / 100))} defaultValue={selected.min} className={cn(inputClass, "text-sm")} />
                </label>
                <span aria-hidden="true" className="text-slate">
                  –
                </span>
                <label className="flex-1">
                  <span className="sr-only">Maximum price in rupees</span>
                  <input name="max" inputMode="numeric" pattern="[0-9]*" placeholder={String(Math.ceil(facets.price.max / 100))} defaultValue={selected.max} className={cn(inputClass, "text-sm")} />
                </label>
              </div>
            </fieldset>
          ) : null}

          <fieldset>
            <legend className="sr-only">Availability</legend>
            <CheckRow name="stock" value="1" label="In stock only" checked={selected.inStockOnly} onChange={autoSubmit} />
          </fieldset>

          <div className={cn(open ? "sticky bottom-0 -mx-5 border-t border-mist bg-ivory px-5 py-4" : "")}>
            <Button type="submit" className="w-full" variant={open ? "primary" : "secondary"}>
              {open ? `Show results` : "Apply filters"}
            </Button>
            {open ? <p className="mt-2 text-center text-[0.8125rem] text-slate">Currently {resultCount} {resultCount === 1 ? "piece" : "pieces"}</p> : null}
          </div>
        </Form>
      </div>
    </>
  );
}

function CheckRow({ name, value, label, checked, onChange }: { name: string; value: string; label: React.ReactNode; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-charcoal hover:text-navy">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} onChange={onChange} className="size-[18px] cursor-pointer accent-navy" />
      {label}
    </label>
  );
}
