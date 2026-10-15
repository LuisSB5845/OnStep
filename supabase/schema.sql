-- =====================================================================
-- OnStep — esquema de base de datos para Supabase
-- Pegar completo en Supabase > SQL Editor > New query > Run.
-- ANTES de correrlo: cambia el correo de la línea marcada con  <<<
-- =====================================================================

-- ---------- Administradores (solo estos correos pueden editar) ----------
create table if not exists public.admins (
  email text primary key
);

insert into public.admins (email)
values ('TU_CORREO@gmail.com')            -- <<< pon aquí el correo con el que entrarás al /admin
on conflict do nothing;

alter table public.admins enable row level security;
-- Sin políticas: nadie puede leer ni modificar esta tabla desde la web.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- Información del negocio (una sola fila) ----------
create table if not exists public.business (
  id          int primary key default 1 check (id = 1),
  name        text not null default 'OnStep',
  tagline     text not null default 'Tenis 100% originales',
  about       text not null default '',
  whatsapp    text not null default '18295570987',
  location    text not null default '',
  hours       text not null default '',
  facebook    text not null default '',
  instagram   text not null default '',
  updated_at  timestamptz not null default now()
);

insert into public.business (id, name, tagline, about, whatsapp, facebook)
values (
  1,
  'OnStep',
  'Tenis 100% originales',
  'Todos nuestros tenis son 100% originales. Busca tu talla, mira el catálogo y escríbenos por WhatsApp para hacer tu pedido.',
  '18295570987',
  'https://www.facebook.com/profile.php?id=61594960177917'
)
on conflict (id) do nothing;

alter table public.business enable row level security;

drop policy if exists "business: lectura pública" on public.business;
create policy "business: lectura pública" on public.business
  for select using (true);

drop policy if exists "business: solo admin edita" on public.business;
create policy "business: solo admin edita" on public.business
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- Tenis ----------
-- sizes:  [{ "us": "9", "eu": "42.5", "uk": "8", "cm": "27", "available": true }, ...]
-- images: URLs públicas de Supabase Storage, en orden (la primera es la portada)
create table if not exists public.sneakers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  brand       text not null,
  description text not null default '',
  price       numeric(10, 2) not null check (price >= 0),
  sale_price  numeric(10, 2) check (sale_price is null or sale_price >= 0),
  gender      text not null default 'hombre'
              check (gender in ('hombre', 'mujer', 'unisex', 'niños')),
  status      text not null default 'disponible'
              check (status in ('disponible', 'agotado', 'oculto')),
  featured    boolean not null default false,
  sizes       jsonb not null default '[]'::jsonb,
  images      text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sneakers_status_idx on public.sneakers (status);
create index if not exists sneakers_created_idx on public.sneakers (created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sneakers_touch on public.sneakers;
create trigger sneakers_touch before update on public.sneakers
  for each row execute function public.touch_updated_at();

drop trigger if exists business_touch on public.business;
create trigger business_touch before update on public.business
  for each row execute function public.touch_updated_at();

alter table public.sneakers enable row level security;

-- El público solo ve lo que no está oculto; el admin lo ve todo.
drop policy if exists "sneakers: lectura pública" on public.sneakers;
create policy "sneakers: lectura pública" on public.sneakers
  for select using (status <> 'oculto' or public.is_admin());

drop policy if exists "sneakers: admin crea" on public.sneakers;
create policy "sneakers: admin crea" on public.sneakers
  for insert with check (public.is_admin());

drop policy if exists "sneakers: admin edita" on public.sneakers;
create policy "sneakers: admin edita" on public.sneakers
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sneakers: admin borra" on public.sneakers;
create policy "sneakers: admin borra" on public.sneakers
  for delete using (public.is_admin());

-- ---------- Fotos (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sneakers', 'sneakers', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: admin sube" on storage.objects;
create policy "fotos: admin sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sneakers' and public.is_admin());

drop policy if exists "fotos: admin edita" on storage.objects;
create policy "fotos: admin edita" on storage.objects
  for update to authenticated
  using (bucket_id = 'sneakers' and public.is_admin());

drop policy if exists "fotos: admin borra" on storage.objects;
create policy "fotos: admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'sneakers' and public.is_admin());
-- La lectura de fotos es pública porque el bucket es público.
