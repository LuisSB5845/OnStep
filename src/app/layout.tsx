import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

// En Vercel se usa sola la URL del proyecto; con dominio propio, pon NEXT_PUBLIC_SITE_URL.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "OnStep · Tenis 100% originales",
  description:
    "Catálogo de tenis 100% originales. Busca tu talla, elige tus tenis y haz tu pedido por WhatsApp.",
  openGraph: {
    title: "OnStep · Tenis 100% originales",
    description: "Mira el catálogo y pide por WhatsApp.",
    type: "website",
    locale: "es_DO",
    siteName: "OnStep",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${GeistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
