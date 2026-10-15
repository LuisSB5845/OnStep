# OnStep — catálogo de tenis

Página de una sola pantalla con el catálogo de OnStep. El cliente ve los tenis, elige su talla y toca **Pedir por WhatsApp**: el mensaje llega al 829-557-0987 con el modelo, la talla, el precio y el link del tenis.

- **Página pública:** `/`
- **Panel privado:** `/admin`. Solo entran los correos de la tabla `admins`.

Sin Supabase conectado, la página corre en **modo demo** con 6 tenis de ejemplo.

---

## Puesta en marcha (unos 20 minutos, todo gratis)

### 1. Supabase (base de datos, fotos y login)

1. Crea una cuenta en <https://supabase.com> y un proyecto nuevo. La región `East US` es la más cercana a RD.
2. Abre `supabase/schema.sql` y en la línea marcada con `<<<` cambia `TU_CORREO@gmail.com` por el correo con el que vas a entrar al admin.
3. En Supabase ve a **SQL Editor → New query**, pega todo el archivo y dale a **Run**. Se crean las tablas, el bucket de fotos y las reglas de seguridad.
4. Ve a **Authentication → Users → Add user → Create new user**. Usa ese mismo correo y una contraseña fuerte, y marca *Auto Confirm User*.
5. Ve a **Authentication → Sign In / Providers** y **desactiva "Allow new users to sign up"**. Así nadie más puede crear cuenta.
6. Ve a **Project Settings → API** (o el botón **Connect**) y copia:
   - `Project URL`
   - `anon public` key

### 2. Vercel (publicar la página)

1. Sube esta carpeta a un repositorio de GitHub.
2. En <https://vercel.com> elige **Add New → Project** e importa el repo.
3. En **Environment Variables** agrega:

   | Nombre | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | el Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la anon key |

4. Dale a **Deploy**. Queda en `https://onstep.vercel.app` o similar.
5. Entra a `/admin`, inicia sesión y agrega tus tenis.

### 3. Dominio propio (cuando quieras)

En Vercel ve a **Settings → Domains**, agrega el dominio y sigue los pasos de DNS. Después agrega la variable `NEXT_PUBLIC_SITE_URL=https://tudominio.com` y vuelve a desplegar, para que los links compartidos usen tu dominio.

---

## Cómo se usa el admin

- **+ Agregar tenis:** sube las fotos (se achican solas), y llena marca, modelo, precio, características y tallas.
  - Escribe la talla US y se llenan EU, UK y CM con la tabla estándar Nike/Adidas. Corrígelas si una marca talla distinto.
  - Desmarca **Hay** en una talla cuando se acabe. Se verá tachada.
- **Estado** de cada tenis:
  - *Disponible:* se puede pedir.
  - *Agotado:* se ve en gris y el botón pregunta cuándo vuelve.
  - *Oculto:* no aparece en la página.
- **★ Destacado:** sale primero.
- **Info del negocio:** frase, descripción, número de WhatsApp, ubicación, horario y redes. Los campos vacíos no se muestran.

Los cambios aparecen en la página pública al instante.

---

## Para desarrollar en tu PC

```bash
npm install
cp .env.example .env.local   # y pega tus llaves (o déjalo vacío para modo demo)
npm run dev                  # http://localhost:3000
```

Stack: Next.js 16 (App Router, Cache Components), Tailwind CSS 4 y Supabase (Postgres + Auth + Storage). La seguridad está en las políticas RLS de `supabase/schema.sql`: el público solo puede leer y solo los correos en `admins` pueden escribir.
