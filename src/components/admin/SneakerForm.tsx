"use client";

import { useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import type { Gender, Size, SizeSystem, Sneaker, Status } from "@/lib/types";
import { OFFERS_ENABLED, SIZE_SYSTEMS, sortSizes, suggestSize } from "@/lib/utils";
import { deletePhotos, uploadPhoto } from "./storage";
import { Card, Field } from "./ui";

type Props = {
  initial: Sneaker | null;
  brands: string[];
  onCancel: () => void;
  onSaved: (msg: string) => void;
};

const COMMON_BRANDS = ["Nike", "Jordan", "Adidas", "New Balance", "Puma", "Asics", "Converse", "Vans", "Reebok", "On"];
const QUICK_US = ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"];

export default function SneakerForm({ initial, brands, onCancel, onSaved }: Props) {
  const supabase = getBrowserClient();
  const isNew = !initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [salePrice, setSalePrice] = useState(initial?.sale_price != null ? String(initial.sale_price) : "");
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "hombre");
  const [status, setStatus] = useState<Status>(initial?.status ?? "disponible");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sizes, setSizes] = useState<Size[]>(sortSizes(initial?.sizes ?? []));
  const [images, setImages] = useState<string[]>(initial?.images ?? []);

  const [newUs, setNewUs] = useState("");
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fotos subidas en esta edición (para borrarlas si se cancela) y fotos quitadas (para borrarlas al guardar).
  const uploadedHere = useRef<string[]>([]);
  const removedHere = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  /* ---------- Fotos ---------- */

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const url = await uploadPhoto(file);
        uploadedHere.current.push(url);
        setImages((imgs) => [...imgs, url]);
      } catch (e) {
        setError(`No se pudo subir ${file.name}: ${(e as Error).message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const movePhoto = (i: number, dir: -1 | 1) =>
    setImages((imgs) => {
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return imgs;
      const next = [...imgs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const makeCover = (i: number) => setImages((imgs) => [imgs[i], ...imgs.filter((_, k) => k !== i)]);

  const removePhoto = (i: number) =>
    setImages((imgs) => {
      removedHere.current.push(imgs[i]);
      return imgs.filter((_, k) => k !== i);
    });

  /* ---------- Tallas ---------- */

  const addSize = (us: string) => {
    const clean = us.trim().replace(",", ".");
    if (!clean || sizes.some((s) => s.us === clean)) return;
    setSizes((list) => sortSizes([...list, suggestSize(clean, gender)]));
    setNewUs("");
  };

  const updateSize = (i: number, key: SizeSystem | "available", value: string | boolean) =>
    setSizes((list) => list.map((s, k) => (k === i ? { ...s, [key]: value } : s)));

  const removeSize = (i: number) => setSizes((list) => list.filter((_, k) => k !== i));

  /* ---------- Guardar / cancelar ---------- */

  const cancel = async () => {
    // Las fotos nuevas que no se llegaron a guardar no deben quedar ocupando espacio.
    await deletePhotos(uploadedHere.current).catch(() => undefined);
    onCancel();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const p = Number(price);
    // Con las ofertas apagadas no se toca el precio de oferta que ya estuviera guardado.
    const sp = OFFERS_ENABLED ? (salePrice.trim() ? Number(salePrice) : null) : (initial?.sale_price ?? null);
    if (!name.trim() || !brand.trim()) return setError("Pon el nombre y la marca.");
    if (!Number.isFinite(p) || p <= 0) return setError("El precio debe ser un número mayor que 0.");
    if (OFFERS_ENABLED && sp != null && (!Number.isFinite(sp) || sp <= 0 || sp >= p))
      return setError("El precio de oferta debe ser menor que el precio normal (o déjalo vacío).");
    if (!images.length) return setError("Sube al menos una foto.");
    if (uploading) return setError("Espera a que terminen de subir las fotos.");

    const row = {
      name: name.trim(),
      brand: brand.trim(),
      description: description.trim(),
      price: p,
      sale_price: sp,
      gender,
      status,
      featured,
      sizes: sortSizes(sizes).map((s) => ({ ...s, us: s.us.trim(), eu: s.eu.trim(), uk: s.uk.trim(), cm: s.cm.trim() })),
      images,
    };

    setSaving(true);
    const { error } = isNew
      ? await supabase.from("sneakers").insert(row)
      : await supabase.from("sneakers").update(row).eq("id", initial!.id);
    setSaving(false);

    if (error) return setError(`No se pudo guardar: ${error.message}`);

    const stillUsed = new Set(images);
    await deletePhotos(removedHere.current.filter((u) => !stillUsed.has(u))).catch(() => undefined);
    onSaved(isNew ? "Tenis agregado" : "Cambios guardados");
  };

  const brandOptions = Array.from(new Set([...brands, ...COMMON_BRANDS]));

  return (
    <form onSubmit={save} className="space-y-4 pb-28">
      <div className="flex items-center gap-2">
        <button type="button" onClick={cancel} className="grid size-10 place-items-center rounded-full hover:bg-white" aria-label="Volver">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">{isNew ? "Agregar tenis" : "Editar tenis"}</h1>
      </div>

      {/* Fotos */}
      <Card title="Fotos">
        <p className="-mt-2 text-sm text-muted">La primera es la portada. Se achican solas antes de subir.</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((src, i) => (
            <li key={src} className="relative overflow-hidden rounded-2xl bg-soft ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Foto ${i + 1}`} className="aspect-square w-full object-cover" />
              {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold text-white">Portada</span>}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label="Quitar foto"
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/95 text-sm font-bold shadow"
              >
                ✕
              </button>
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                <button type="button" onClick={() => movePhoto(i, -1)} disabled={i === 0} aria-label="Mover a la izquierda" className="photo-btn">
                  ‹
                </button>
                {i !== 0 && (
                  <button type="button" onClick={() => makeCover(i)} className="photo-btn px-2 text-[11px] font-semibold">
                    Portada
                  </button>
                )}
                <button type="button" onClick={() => movePhoto(i, 1)} disabled={i === images.length - 1} aria-label="Mover a la derecha" className="photo-btn">
                  ›
                </button>
              </div>
            </li>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <li key={`up-${i}`} className="grid aspect-square place-items-center rounded-2xl bg-soft text-xs text-muted ring-1 ring-line">
              Subiendo…
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="grid aspect-square w-full place-items-center rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-muted hover:border-foreground hover:text-foreground"
            >
              + Fotos
            </button>
          </li>
        </ul>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
      </Card>

      {/* Datos */}
      <Card title="Datos">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Marca">
            <input list="brand-list" required value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: Nike" className="input" />
            <datalist id="brand-list">
              {brandOptions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Field>
          <Field label="Modelo">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Air Jordan 4 Black Cat" className="input" />
          </Field>
          <Field label="Precio (RD$)">
            <input inputMode="numeric" required value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="7500" className="input" />
          </Field>
          {OFFERS_ENABLED && (
            <Field label="Precio de oferta (opcional)" hint="Si lo pones, se muestra tachado el precio normal.">
              <input inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="—" className="input" />
            </Field>
          )}
          <Field label="Para">
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className="input">
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
              <option value="unisex">Unisex</option>
              <option value="niños">Niños</option>
            </select>
          </Field>
          <Field label="Estado">
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="input">
              <option value="disponible">Disponible</option>
              <option value="agotado">Agotado (se ve, pero no se puede pedir)</option>
              <option value="oculto">Oculto (no aparece en la página)</option>
            </select>
          </Field>
        </div>
        <Field label="Características" hint="Color, material, código de estilo, si trae caja… Lo que quieras que el cliente lea.">
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={"Color: Negro / Blanco\nNuevos en su caja original"}
            className="input h-auto py-3"
          />
        </Field>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-5 accent-foreground" />
          <span className="text-sm font-semibold">★ Destacado (sale primero en la página)</span>
        </label>
      </Card>

      {/* Tallas */}
      <Card title="Tallas">
        <p className="-mt-2 text-sm text-muted">
          Escribe la talla US y se llenan EU, UK y CM solas (tabla estándar). Corrígelas si la marca cambia.
        </p>
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            value={newUs}
            onChange={(e) => setNewUs(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSize(newUs);
              }
            }}
            placeholder="Talla US, ej: 9.5"
            className="input flex-1"
          />
          <button type="button" onClick={() => addSize(newUs)} className="btn-secondary">
            Agregar
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_US.filter((us) => !sizes.some((s) => s.us === us)).map((us) => (
            <button key={us} type="button" onClick={() => addSize(us)} className="h-8 rounded-full border border-line bg-white px-3 text-xs font-semibold hover:border-foreground">
              + {us}
            </button>
          ))}
        </div>

        {sizes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  {SIZE_SYSTEMS.map((s) => (
                    <th key={s.key} className="pb-1 font-semibold">
                      {s.label}
                    </th>
                  ))}
                  <th className="pb-1 text-center font-semibold">Hay</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sizes.map((s, i) => (
                  <tr key={s.us + i} className={s.available ? "" : "opacity-50"}>
                    {SIZE_SYSTEMS.map((sys) => (
                      <td key={sys.key} className="py-1 pr-1.5">
                        <input
                          value={s[sys.key]}
                          onChange={(e) => updateSize(i, sys.key, e.target.value)}
                          aria-label={`Talla ${sys.label}`}
                          className="input h-10 px-2 text-center"
                        />
                      </td>
                    ))}
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={s.available}
                        onChange={(e) => updateSize(i, "available", e.target.checked)}
                        aria-label="Disponible"
                        className="size-5 accent-foreground"
                      />
                    </td>
                    <td className="text-right">
                      <button type="button" onClick={() => removeSize(i)} aria-label="Quitar talla" className="grid size-8 place-items-center rounded-full text-muted hover:bg-soft">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Barra fija de guardar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {error ? <p className="flex-1 text-sm text-sale">{error}</p> : <span className="flex-1" />}
          <button type="button" onClick={cancel} className="btn-secondary">
            Cancelar
          </button>
          <button disabled={saving || uploading > 0} className="btn-primary">
            {saving ? "Guardando…" : uploading ? "Subiendo fotos…" : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}
