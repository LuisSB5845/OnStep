import { cacheLife, cacheTag } from "next/cache";
import { getPublicClient, isConfigured } from "./supabase";
import type { Business, Sneaker } from "./types";
import { DEMO_BUSINESS, DEMO_SNEAKERS } from "./demo";
import { DEFAULT_BUSINESS } from "./defaults";

export { DEFAULT_BUSINESS };

export const CATALOG_TAG = "catalog";

function toSneaker(row: Record<string, unknown>): Sneaker {
  return {
    ...(row as unknown as Sneaker),
    price: Number(row.price),
    sale_price: row.sale_price == null ? null : Number(row.sale_price),
    sizes: Array.isArray(row.sizes) ? (row.sizes as Sneaker["sizes"]) : [],
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
  };
}

/** Catálogo público + info del negocio. Se cachea y se refresca al guardar desde /admin. */
export async function getCatalog(): Promise<{ business: Business; sneakers: Sneaker[]; demo: boolean }> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  if (!isConfigured) {
    return { business: DEMO_BUSINESS, sneakers: DEMO_SNEAKERS, demo: true };
  }

  const supabase = getPublicClient();
  const [biz, items] = await Promise.all([
    supabase.from("business").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("sneakers")
      .select("*")
      .neq("status", "oculto")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (biz.error) console.error("[catalog] business:", biz.error.message);
  if (items.error) console.error("[catalog] sneakers:", items.error.message);

  return {
    business: { ...DEFAULT_BUSINESS, ...(biz.data ?? {}) },
    sneakers: (items.data ?? []).map(toSneaker),
    demo: false,
  };
}
