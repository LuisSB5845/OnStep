import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Sin variables de entorno, la web corre en "modo demo" con tenis de ejemplo. */
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const BUCKET = "sneakers";

let browserClient: SupabaseClient | null = null;

/** Cliente para el navegador (admin). Guarda la sesión en el dispositivo. */
export function getBrowserClient(): SupabaseClient {
  if (!isConfigured) throw new Error("Supabase no está configurado");
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return browserClient;
}

/** Cliente de servidor sin sesión: solo ve lo público (lo que permite RLS). */
export function getPublicClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
