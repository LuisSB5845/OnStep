// Datos de ejemplo: solo se muestran mientras Supabase no esté configurado.
import type { Business, Size, Sneaker } from "./types";
import { suggestSize } from "./utils";

export const DEMO_BUSINESS: Business = {
  name: "OnStep",
  tagline: "Tenis 100% originales",
  about:
    "Todos nuestros tenis son 100% originales. Mira el catálogo, elige tu talla y escríbenos por WhatsApp para hacer tu pedido.",
  whatsapp: "18295570987",
  location: "",
  hours: "",
  facebook: "https://www.facebook.com/profile.php?id=61594960177917",
  instagram: "",
};

const sizes = (list: string[], soldOut: string[] = [], gender: "hombre" | "mujer" = "hombre"): Size[] =>
  list.map((us) => ({ ...suggestSize(us, gender), available: !soldOut.includes(us) }));

const base = { description: "", featured: false, created_at: "2026-10-01T12:00:00Z", updated_at: "2026-10-01T12:00:00Z" };

export const DEMO_SNEAKERS: Sneaker[] = [
  { ...base, id: "d1", name: "Air Jordan 1 Mid", brand: "Jordan", price: 7500, sale_price: null, gender: "hombre", status: "disponible", featured: true,
    description: "Nuevos en caja. Cuero premium, suela de goma.", sizes: sizes(["8", "8.5", "9", "10", "11"], ["8.5"]), images: ["/demo/s1.svg", "/demo/s3.svg"] },
  { ...base, id: "d2", name: "Air Force 1 '07", brand: "Nike", price: 6200, sale_price: 5500, gender: "unisex", status: "disponible", featured: true,
    description: "El clásico blanco. Nuevos con caja original.", sizes: sizes(["7", "8", "9", "9.5", "10", "12"]), images: ["/demo/s2.svg"] },
  { ...base, id: "d3", name: "Samba OG", brand: "Adidas", price: 6800, sale_price: null, gender: "unisex", status: "disponible",
    sizes: sizes(["6", "7", "8", "9"]), images: ["/demo/s3.svg"] },
  { ...base, id: "d4", name: "550", brand: "New Balance", price: 7200, sale_price: null, gender: "hombre", status: "disponible",
    sizes: sizes(["9", "10", "10.5"]), images: ["/demo/s4.svg"] },
  { ...base, id: "d5", name: "Dunk Low", brand: "Nike", price: 6900, sale_price: null, gender: "mujer", status: "disponible",
    sizes: sizes(["6", "7", "7.5", "8"], [], "mujer"), images: ["/demo/s5.svg"] },
  { ...base, id: "d6", name: "Gel-Kayano 14", brand: "Asics", price: 7800, sale_price: null, gender: "unisex", status: "agotado",
    sizes: sizes(["9", "10"], ["9", "10"]), images: ["/demo/s6.svg"] },
];
