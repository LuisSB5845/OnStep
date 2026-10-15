import { BUCKET, getBrowserClient } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import type { Sneaker } from "@/lib/types";

export function toSneaker(row: Record<string, unknown>): Sneaker {
  return {
    ...(row as unknown as Sneaker),
    price: Number(row.price),
    sale_price: row.sale_price == null ? null : Number(row.sale_price),
    sizes: Array.isArray(row.sizes) ? (row.sizes as Sneaker["sizes"]) : [],
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
  };
}

/** Comprime y sube una foto. Devuelve su URL pública. */
export async function uploadPhoto(file: File): Promise<string> {
  const supabase = getBrowserClient();
  const blob = await compressImage(file);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Saca la ruta dentro del bucket a partir de la URL pública. */
function pathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

/** Borra fotos del almacenamiento (ignora las que no son de Supabase). */
export async function deletePhotos(urls: string[]): Promise<void> {
  const paths = urls.map(pathFromUrl).filter((p): p is string => Boolean(p));
  if (!paths.length) return;
  await getBrowserClient().storage.from(BUCKET).remove(paths);
}
