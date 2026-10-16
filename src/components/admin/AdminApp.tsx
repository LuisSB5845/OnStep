"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { refreshCatalog } from "@/app/actions";
import { getBrowserClient, isConfigured } from "@/lib/supabase";
import type { Sneaker, Status } from "@/lib/types";
import { finalPrice, formatPrice, normalizeText, sneakerTitle } from "@/lib/utils";
import { SearchIcon } from "../icons";
import { deletePhotos, toSneaker } from "./storage";
import SneakerForm from "./SneakerForm";
import BusinessForm from "./BusinessForm";
import { Centered } from "./ui";

type View = { kind: "list" } | { kind: "edit"; sneaker: Sneaker | null } | { kind: "business" };

export default function AdminApp() {
  if (!isConfigured) return <NotConfigured />;
  return <AdminGate />;
}

/* ---------------- Sesión ---------------- */

function AdminGate() {
  const supabase = getBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  // Confirma que el correo está en la tabla de administradores.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase.rpc("is_admin").then(({ data, error }) => alive && setAllowed(!error && data === true));
    return () => {
      alive = false;
    };
  }, [userId, supabase]);

  if (checking || (session && allowed === null)) return <Centered>Cargando…</Centered>;
  if (!session) return <Login />;
  if (!allowed)
    return (
      <Centered>
        <p className="font-semibold">Esta cuenta no tiene permiso de administrador.</p>
        <p className="mt-1 text-sm text-muted">{session.user.email}</p>
        <button
          onClick={() => {
            setAllowed(null);
            supabase.auth.signOut();
          }}
          className="btn-secondary mt-4"
        >
          Cerrar sesión
        </button>
      </Centered>
    );
  return <Dashboard session={session} />;
}

function Login() {
  const supabase = getBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError("Correo o contraseña incorrectos.");
    setBusy(false);
  };

  return (
    <Centered>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="OnStep" className="mx-auto h-10 w-auto" />
      <h1 className="mt-4 text-xl font-bold">Panel de administración</h1>
      <form onSubmit={submit} className="mt-6 space-y-3 text-left">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Correo</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Contraseña</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </label>
        {error && <p className="text-sm text-sale">{error}</p>}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </Centered>
  );
}

/* ---------------- Panel ---------------- */

function Dashboard({ session }: { session: Session }) {
  const supabase = getBrowserClient();
  const [items, setItems] = useState<Sneaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>({ kind: "list" });
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("sneakers").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else {
      setError("");
      setItems((data ?? []).map(toSneaker));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    load();
  }, [load]);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  };

  /** Recarga la lista y actualiza la página pública al instante. */
  const afterChange = async (msg: string) => {
    await load();
    await refreshCatalog(session.access_token).catch(() => undefined);
    notify(msg);
  };

  const setStatus = async (s: Sneaker, status: Status) => {
    setItems((list) => list.map((x) => (x.id === s.id ? { ...x, status } : x)));
    const { error } = await supabase.from("sneakers").update({ status }).eq("id", s.id);
    if (error) {
      notify("No se pudo cambiar el estado");
      load();
      return;
    }
    await afterChange(`Ahora está ${status}`);
  };

  const remove = async (s: Sneaker) => {
    if (!window.confirm(`¿Borrar "${sneakerTitle(s)}"? Esto no se puede deshacer.`)) return;
    const { error } = await supabase.from("sneakers").delete().eq("id", s.id);
    if (error) {
      notify("No se pudo borrar");
      return;
    }
    await deletePhotos(s.images).catch(() => undefined);
    await afterChange("Tenis borrado");
  };

  const visible = useMemo(() => {
    const q = normalizeText(query.trim());
    return q ? items.filter((s) => normalizeText(sneakerTitle(s)).includes(q)) : items;
  }, [items, query]);

  const count = (st: Status) => items.filter((s) => s.status === st).length;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <button onClick={() => setView({ kind: "list" })} className="flex items-center gap-2" aria-label="Inicio del panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="OnStep" className="h-7 w-auto" />
            <span className="rounded-full bg-soft px-2 py-0.5 text-xs font-semibold text-muted">Admin</span>
          </button>
          <div className="flex items-center gap-1 text-sm">
            <a href="/" target="_blank" rel="noopener" className="rounded-full px-3 py-1.5 font-semibold hover:bg-soft">
              Ver página
            </a>
            <button onClick={() => supabase.auth.signOut()} className="rounded-full px-3 py-1.5 font-semibold text-muted hover:bg-soft">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {view.kind === "edit" ? (
          <SneakerForm
            initial={view.sneaker}
            brands={Array.from(new Set(items.map((s) => s.brand))).sort()}
            onCancel={() => setView({ kind: "list" })}
            onSaved={async (msg) => {
              setView({ kind: "list" });
              await afterChange(msg);
            }}
          />
        ) : view.kind === "business" ? (
          <BusinessForm
            onCancel={() => setView({ kind: "list" })}
            onSaved={async () => {
              setView({ kind: "list" });
              await afterChange("Información guardada");
            }}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Mis tenis</h1>
                <p className="text-sm text-muted">
                  {count("disponible")} disponibles · {count("agotado")} agotados · {count("oculto")} ocultos
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setView({ kind: "business" })} className="btn-secondary">
                  Info del negocio
                </button>
                <button onClick={() => setView({ kind: "edit", sneaker: null })} className="btn-primary">
                  + Agregar tenis
                </button>
              </div>
            </div>

            {items.length > 5 && (
              <label className="relative mt-5 block">
                <span className="sr-only">Buscar</span>
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" className="input pl-11" />
              </label>
            )}

            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-sale">Error: {error}</p>}

            {loading ? (
              <p className="mt-10 text-center text-muted">Cargando…</p>
            ) : items.length === 0 ? (
              <div className="mt-6 rounded-3xl bg-white p-10 text-center ring-1 ring-line">
                <p className="text-lg font-semibold">Todavía no hay tenis</p>
                <p className="mt-1 text-muted">Agrega el primero y aparecerá en la página.</p>
                <button onClick={() => setView({ kind: "edit", sneaker: null })} className="btn-primary mt-5">
                  + Agregar tenis
                </button>
              </div>
            ) : (
              <ul className="mt-5 space-y-2">
                {visible.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-2xl bg-white p-2.5 ring-1 ring-line">
                    <button
                      onClick={() => setView({ kind: "edit", sneaker: s })}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-soft">
                        {s.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.images[0]} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {s.featured && <span title="Destacado">★ </span>}
                          {sneakerTitle(s)}
                        </p>
                        <p className="text-sm text-muted">
                          {formatPrice(finalPrice(s))} · {s.sizes.filter((z) => z.available).length} tallas
                        </p>
                      </div>
                    </button>
                    <select
                      value={s.status}
                      onChange={(e) => setStatus(s, e.target.value as Status)}
                      aria-label="Estado"
                      className={`h-9 rounded-full border bg-white px-2 text-xs font-semibold ${
                        s.status === "disponible"
                          ? "border-wa text-wa-dark"
                          : s.status === "agotado"
                            ? "border-sale text-sale"
                            : "border-line text-muted"
                      }`}
                    >
                      <option value="disponible">Disponible</option>
                      <option value="agotado">Agotado</option>
                      <option value="oculto">Oculto</option>
                    </select>
                    <button
                      onClick={() => remove(s)}
                      aria-label={`Borrar ${sneakerTitle(s)}`}
                      className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-sale"
                    >
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      {toast && (
        <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4" role="status">
          <p className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white shadow-lg">{toast}</p>
        </div>
      )}
    </>
  );
}

function NotConfigured() {
  return (
    <Centered>
      <h1 className="text-lg font-bold">Falta conectar Supabase</h1>
      <p className="mt-2 text-sm text-muted">
        Agrega <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en Vercel (o en <code>.env.local</code>) y vuelve a
        desplegar. Los pasos están en el README.
      </p>
    </Centered>
  );
}
