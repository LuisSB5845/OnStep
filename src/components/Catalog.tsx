"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Business, Sneaker } from "@/lib/types";
import {
  availableSizes,
  finalPrice,
  formatPrice,
  hasDiscount,
  isSoldOut,
  matchesSize,
  normalizeText,
  sortSizes,
  whatsappLink,
} from "@/lib/utils";
import ProductSheet from "./ProductSheet";
import {
  CheckBadgeIcon,
  ClockIcon,
  FacebookIcon,
  InstagramIcon,
  PinIcon,
  SearchIcon,
  WhatsAppIcon,
} from "./icons";

type Props = { business: Business; sneakers: Sneaker[]; demo: boolean };

export default function Catalog({ business, sneakers, demo }: Props) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("Todas");
  const [size, setSize] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const brands = useMemo(
    () => ["Todas", ...Array.from(new Set(sneakers.map((s) => s.brand))).sort((a, b) => a.localeCompare(b))],
    [sneakers],
  );

  const visible = useMemo(() => {
    const q = normalizeText(query.trim());
    return sneakers
      .filter((s) => brand === "Todas" || s.brand === brand)
      .filter((s) => !size.trim() || availableSizes(s).some((z) => matchesSize(z, size)))
      .filter((s) => !q || normalizeText(`${s.brand} ${s.name}`).includes(q))
      .sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)));
  }, [sneakers, brand, size, query]);

  const open = sneakers.find((s) => s.id === openId) ?? null;

  // Permite compartir un tenis específico: onstep.../#t=<id>
  useEffect(() => {
    const read = () => {
      const m = window.location.hash.match(/^#t=(.+)$/);
      setOpenId(m ? decodeURIComponent(m[1]) : null);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const openSneaker = (id: string) => {
    history.replaceState(null, "", `#t=${encodeURIComponent(id)}`);
    setOpenId(id);
  };

  const close = useCallback(() => {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    setOpenId(null);
  }, []);

  const clearFilters = () => {
    setQuery("");
    setBrand("Todas");
    setSize("");
  };

  const generalMsg = `Hola ${business.name} 👋 Quisiera información sobre sus tenis.`;

  return (
    <>
      {demo && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
          Modo demo: estos tenis son de ejemplo. Conecta Supabase para ver tu catálogo real.
        </div>
      )}

      {/* Encabezado */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="#" aria-label={business.name} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt={business.name} className="h-9 w-auto" />
          </a>
          <a
            href={whatsappLink(business.whatsapp, generalMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-wa px-4 py-2 text-sm font-semibold text-white hover:bg-wa-dark"
          >
            <WhatsAppIcon className="size-4" />
            Escríbenos
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* Presentación */}
        <section className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:pt-12">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            <CheckBadgeIcon className="size-4" /> {business.tagline}
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Encuentra tus próximos tenis
          </h1>
          {business.about && <p className="mt-3 max-w-xl text-base text-muted sm:text-lg">{business.about}</p>}

          <ol className="mt-6 grid grid-cols-3 gap-2 text-center text-xs sm:max-w-xl sm:text-sm">
            {["Busca tu talla", "Elige tus tenis", "Pide por WhatsApp"].map((t, i) => (
              <li key={t} className="rounded-2xl bg-soft px-2 py-3">
                <span className="mx-auto mb-1 grid size-7 place-items-center rounded-full bg-foreground text-sm font-bold text-white">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </section>

        {/* Catálogo */}
        <section id="catalogo" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="sticky top-16 z-20 -mx-4 space-y-3 bg-white/95 px-4 pb-3 pt-2 backdrop-blur">
            <div className="flex gap-2">
              <label className="relative flex-1">
                <span className="sr-only">Buscar</span>
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar modelo…"
                  className="h-12 w-full rounded-2xl border border-line bg-white pl-11 pr-4 text-base outline-none focus:border-foreground"
                />
              </label>
              <label className="relative w-32 shrink-0">
                <span className="sr-only">Tu talla (US o EU)</span>
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                  Talla
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={size}
                  onChange={(e) => setSize(e.target.value.replace(/[^\d.,]/g, "").slice(0, 4))}
                  placeholder="11"
                  className={`h-12 w-full rounded-2xl border bg-white pl-[3.75rem] pr-3 text-base font-semibold outline-none focus:border-foreground ${size ? "border-foreground" : "border-line"}`}
                />
              </label>
            </div>

            {brands.length > 2 && (
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {brands.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBrand(b)}
                    aria-pressed={brand === b}
                    className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                      brand === b ? "border-foreground bg-foreground text-white" : "border-line bg-white hover:border-foreground"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="mb-3 mt-2 text-sm text-muted">
            {visible.length === 1 ? "1 modelo" : `${visible.length} modelos`}
            {size.trim() && ` en talla ${size.trim()}`}
          </p>

          {visible.length === 0 ? (
            <div className="rounded-3xl bg-soft px-6 py-14 text-center">
              <p className="text-lg font-semibold">
                {sneakers.length === 0 ? "Pronto subiremos nuevos modelos" : "No encontramos tenis con esos filtros"}
              </p>
              <p className="mt-1 text-muted">
                {sneakers.length === 0 ? "Mientras tanto, escríbenos por WhatsApp." : "Prueba con otra talla o marca, o pregúntanos por WhatsApp."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {sneakers.length > 0 && (
                  <button onClick={clearFilters} className="h-11 rounded-full border border-foreground px-5 font-semibold">
                    Ver todos
                  </button>
                )}
                <a
                  href={whatsappLink(business.whatsapp, generalMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-wa px-5 font-semibold text-white"
                >
                  <WhatsAppIcon className="size-5" /> WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((s) => (
                <li key={s.id}>
                  <ProductCard sneaker={s} onOpen={() => openSneaker(s.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Pie de página */}
      <footer className="border-t border-line bg-soft">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt={business.name} className="h-8 w-auto" />
            <p className="mt-3 max-w-sm text-sm text-muted">{business.tagline}. Pedidos por WhatsApp.</p>
          </div>
          <ul className="space-y-3 text-sm">
            {business.location && (
              <li className="flex items-start gap-2">
                <PinIcon className="mt-0.5 size-4 shrink-0" /> {business.location}
              </li>
            )}
            {business.hours && (
              <li className="flex items-start gap-2">
                <ClockIcon className="mt-0.5 size-4 shrink-0" /> {business.hours}
              </li>
            )}
            <li>
              <a
                href={whatsappLink(business.whatsapp, generalMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-semibold hover:underline"
              >
                <WhatsAppIcon className="size-4 text-wa" /> {formatPhone(business.whatsapp)}
              </a>
            </li>
            <li className="flex gap-3 pt-1">
              {business.facebook && (
                <a href={business.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid size-10 place-items-center rounded-full bg-white ring-1 ring-line hover:ring-foreground">
                  <FacebookIcon className="size-5" />
                </a>
              )}
              {business.instagram && (
                <a href={business.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid size-10 place-items-center rounded-full bg-white ring-1 ring-line hover:ring-foreground">
                  <InstagramIcon className="size-5" />
                </a>
              )}
            </li>
          </ul>
        </div>
        <p className="pb-8 text-center text-xs text-muted">© {business.name}</p>
      </footer>

      {open && (
        <ProductSheet
          key={open.id}
          sneaker={open}
          whatsapp={business.whatsapp}
          typedSize={size}
          onClose={close}
        />
      )}
    </>
  );
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : raw;
}

function ProductCard({ sneaker: s, onOpen }: { sneaker: Sneaker; onOpen: () => void }) {
  const soldOut = isSoldOut(s);
  const cover = s.images[0];
  return (
    <button onClick={onOpen} className="group block w-full text-left">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-soft">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={`${s.brand} ${s.name}`}
            loading="lazy"
            className={`size-full object-cover transition duration-300 group-hover:scale-[1.03] ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <div className="grid size-full place-items-center text-sm text-muted">Sin foto</div>
        )}
        {soldOut ? (
          <span className="absolute left-2 top-2 rounded-full bg-white px-2.5 py-1 text-xs font-bold">Agotado</span>
        ) : hasDiscount(s) ? (
          <span className="absolute left-2 top-2 rounded-full bg-sale px-2.5 py-1 text-xs font-bold text-white">Oferta</span>
        ) : null}
      </div>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted">{s.brand}</p>
      <p className="line-clamp-2 font-semibold leading-snug">{s.name}</p>
      {!soldOut && (
        <p className="mt-0.5 text-sm text-muted">
          Talla {sortSizes(availableSizes(s)).map((z) => z.us).join(", ")} US
        </p>
      )}
      <p className="mt-0.5 flex items-baseline gap-1.5">
        <span className={`font-bold ${hasDiscount(s) ? "text-sale" : ""}`}>{formatPrice(finalPrice(s))}</span>
        {hasDiscount(s) && <span className="text-sm text-muted line-through">{formatPrice(s.price)}</span>}
      </p>
    </button>
  );
}
