"use client";

import { useEffect, useRef, useState } from "react";
import type { Sneaker } from "@/lib/types";
import {
  availableSizes,
  finalPrice,
  formatPrice,
  fullSizeLabel,
  hasDiscount,
  isSoldOut,
  matchesSize,
  orderMessage,
  sneakerTitle,
  sortSizes,
  whatsappLink,
} from "@/lib/utils";
import { CheckBadgeIcon, ChevronIcon, CloseIcon, WhatsAppIcon } from "./icons";

type Props = {
  sneaker: Sneaker;
  whatsapp: string;
  /** La talla que el cliente escribió en el buscador (puede estar vacía). */
  typedSize: string;
  onClose: () => void;
};

export default function ProductSheet({ sneaker, whatsapp, typedSize, onClose }: Props) {
  const sizes = sortSizes(availableSizes(sneaker));
  const soldOut = isSoldOut(sneaker);
  // La talla del pedido sale sola: la que buscó el cliente o, si el tenis tiene una sola, esa.
  const orderSize = sizes.find((s) => matchesSize(s, typedSize)) ?? (sizes.length === 1 ? sizes[0] : null);
  const [photo, setPhoto] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape, bloquear el scroll de fondo y enfocar el botón de cerrar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setPhoto(Math.round(el.scrollLeft / el.clientWidth));
  };

  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/#t=${sneaker.id}` : "";
  const message = soldOut
    ? `Hola OnStep 👋 ¿Les vuelven a llegar los ${sneakerTitle(sneaker)}?\n\n${pageUrl}`
    : orderMessage(sneaker, orderSize, pageUrl);
  const images = sneaker.images.length ? sneaker.images : [""];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6 animate-fade"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="relative flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl animate-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-white/90 shadow ring-1 ring-black/5 hover:bg-white"
        >
          <CloseIcon />
        </button>

        <div className="overflow-y-auto sm:grid sm:grid-cols-2">
          {/* Fotos */}
          <div className="relative bg-soft">
            <div
              ref={trackRef}
              onScroll={onScroll}
              className="no-scrollbar flex aspect-square snap-x snap-mandatory overflow-x-auto"
            >
              {images.map((src, i) => (
                <div key={i} className="relative w-full shrink-0 snap-center">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={`${sneakerTitle(sneaker)} — foto ${i + 1}`}
                      className="size-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-muted">Sin foto</div>
                  )}
                </div>
              ))}
            </div>

            {images.length > 1 && (
              <>
                <button
                  onClick={() => goTo(Math.max(0, photo - 1))}
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-white/90 p-2 shadow sm:grid"
                >
                  <ChevronIcon dir="left" />
                </button>
                <button
                  onClick={() => goTo(Math.min(images.length - 1, photo + 1))}
                  aria-label="Foto siguiente"
                  className="absolute right-2 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-white/90 p-2 shadow sm:grid"
                >
                  <ChevronIcon />
                </button>
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Ver foto ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${i === photo ? "w-5 bg-foreground" : "w-2 bg-foreground/30"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Detalles */}
          <div className="flex flex-col gap-5 p-5 sm:p-7">
            <div>
              {sneaker.name.trim() && (
                <p className="text-sm font-medium uppercase tracking-wide text-muted">{sneaker.brand}</p>
              )}
              <h2 id="sheet-title" className="mt-0.5 text-2xl font-bold leading-tight">
                {sneaker.name.trim() || sneaker.brand}
              </h2>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${hasDiscount(sneaker) ? "text-sale" : ""}`}>
                  {formatPrice(finalPrice(sneaker))}
                </span>
                {hasDiscount(sneaker) && (
                  <span className="text-base text-muted line-through">{formatPrice(sneaker.price)}</span>
                )}
              </div>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1 text-sm font-medium">
                <CheckBadgeIcon className="size-4" /> 100% original
              </p>
            </div>

            {soldOut ? (
              <p className="rounded-2xl bg-soft p-4 text-sm">
                Este modelo está <strong>agotado</strong> por ahora. Escríbenos y te avisamos cuando vuelva.
              </p>
            ) : (
              <div>
                <h3 className="font-semibold">{sizes.length === 1 ? "Talla" : "Tallas disponibles"}</h3>
                <ul className="mt-2 space-y-2">
                  {sizes.map((z) => (
                    <li
                      key={z.us}
                      className={`rounded-xl border px-4 py-3 ${orderSize?.us === z.us ? "border-foreground" : "border-line"}`}
                    >
                      <span className="text-lg font-bold">US {z.us}</span>
                      <span className="ml-2 text-sm text-muted">{fullSizeLabel({ ...z, us: "" })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sneaker.description && (
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/80">{sneaker.description}</p>
            )}
          </div>
        </div>

        {/* Botón de pedido siempre visible */}
        <div className="border-t border-line bg-white p-4 sm:px-7">
          <a
            href={whatsappLink(whatsapp, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-wa text-lg font-semibold text-white transition hover:bg-wa-dark"
          >
            <WhatsAppIcon className="size-6" />
            {soldOut ? "Preguntar por WhatsApp" : "Pedir por WhatsApp"}
          </a>
          {!soldOut && !orderSize && (
            <p className="mt-2 text-center text-xs text-muted">Dinos tu talla por WhatsApp.</p>
          )}
        </div>
      </div>
    </div>
  );
}
