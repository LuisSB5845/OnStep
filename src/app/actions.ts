"use server";

import { createClient } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/data";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isConfigured } from "@/lib/supabase";

/**
 * Se llama desde /admin después de guardar algo, para que la página pública
 * muestre el cambio al instante. Solo funciona con una sesión de administrador.
 */
export async function refreshCatalog(accessToken: string): Promise<{ ok: boolean }> {
  if (!isConfigured || typeof accessToken !== "string" || !accessToken) return { ok: false };

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data, error } = await supabase.rpc("is_admin");
  if (error || data !== true) return { ok: false };

  updateTag(CATALOG_TAG);
  return { ok: true };
}
