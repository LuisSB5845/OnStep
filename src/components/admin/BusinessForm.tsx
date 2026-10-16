"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BUSINESS } from "@/lib/defaults";
import { getBrowserClient } from "@/lib/supabase";
import type { Business } from "@/lib/types";
import { normalizePhone } from "@/lib/utils";
import { Card, Field } from "./ui";

type Props = { onCancel: () => void; onSaved: () => void };

const FIELDS: { key: keyof Business; label: string; hint?: string; long?: boolean; placeholder?: string }[] = [
  { key: "name", label: "Nombre del negocio" },
  { key: "tagline", label: "Frase corta", hint: "Sale arriba en la página.", placeholder: "Tenis 100% originales" },
  { key: "about", label: "Sobre el negocio", long: true, hint: "Un par de líneas debajo del título." },
  { key: "whatsapp", label: "WhatsApp", hint: "A este número llegan los pedidos.", placeholder: "829-557-0987" },
  { key: "location", label: "Ubicación (opcional)", placeholder: "Ciudad o zona de entrega" },
  { key: "hours", label: "Horario (opcional)", placeholder: "Lunes a sábado, 9 a.m. – 7 p.m." },
  { key: "facebook", label: "Link de Facebook (opcional)" },
  { key: "instagram", label: "Link de Instagram (opcional)" },
];

export default function BusinessForm({ onCancel, onSaved }: Props) {
  const supabase = getBrowserClient();
  const [form, setForm] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("business")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setForm({ ...DEFAULT_BUSINESS, ...(data ?? {}) }));
  }, [supabase]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const phone = normalizePhone(form.whatsapp);
    if (phone.length < 10) return setError("Revisa el número de WhatsApp.");
    setSaving(true);
    const row = Object.fromEntries(FIELDS.map((f) => [f.key, String(form[f.key] ?? "").trim()]));
    // update y no upsert: la tabla solo deja EDITAR a los admins (no insertar), y un upsert
    // intenta insertar primero, así que Supabase lo rechazaba siempre.
    const { data, error } = await supabase
      .from("business")
      .update({ ...row, whatsapp: phone })
      .eq("id", 1)
      .select("id");
    setSaving(false);
    if (error) return setError(`No se pudo guardar: ${error.message}`);
    // Sin permiso, Supabase no da error: simplemente no cambia ninguna fila.
    if (!data?.length) return setError("No se pudo guardar: tu usuario no tiene permiso de admin.");
    onSaved();
  };

  if (!form) return <p className="mt-10 text-center text-muted">Cargando…</p>;

  return (
    <form onSubmit={save} className="space-y-4">
      <h1 className="text-2xl font-bold">Info del negocio</h1>
      <Card title="Lo que ve el cliente">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            {f.long ? (
              <textarea
                rows={3}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="input h-auto py-3"
              />
            ) : (
              <input
                value={form[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="input"
              />
            )}
          </Field>
        ))}
      </Card>
      {error && <p className="text-sm text-sale">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button disabled={saving} className="btn-primary">
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
