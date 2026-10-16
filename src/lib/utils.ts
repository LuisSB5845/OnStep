import type { Gender, Size, SizeSystem, Sneaker } from "./types";

/* ---------- Dinero ---------- */

const money = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 0,
});

/** 5500 -> "RD$5,500" */
export function formatPrice(value: number): string {
  return money.format(value).replace(/^DOP\s?/, "RD$").replace(/^RD\$\s/, "RD$");
}

/**
 * Interruptor general de ofertas. Cada tenis se pone en oferta con la casilla "En oferta"
 * del admin; con `false` se ocultan todas (la casilla y el precio tachado) sin borrar nada.
 */
export const OFFERS_ENABLED = true;

export function finalPrice(s: Pick<Sneaker, "price" | "sale_price">): number {
  return hasDiscount(s) ? s.sale_price! : s.price;
}

export function hasDiscount(s: Pick<Sneaker, "price" | "sale_price">): boolean {
  return OFFERS_ENABLED && s.sale_price != null && s.sale_price < s.price;
}

/** "Brooks Catamount", o solo "Brooks" si no se escribió el modelo. */
export function sneakerTitle(s: Pick<Sneaker, "brand" | "name">): string {
  return [s.brand, s.name].map((t) => t.trim()).filter(Boolean).join(" ");
}

/* ---------- WhatsApp ---------- */

/** Deja solo los dígitos y agrega el 1 de RD si falta: "829-557-0987" -> "18295570987" */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? `1${digits}` : digits;
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

export function orderMessage(s: Sneaker, size: Size | null, pageUrl: string): string {
  const lines = [
    `Hola OnStep 👋 Me interesan estos tenis:`,
    ``,
    `👟 ${sneakerTitle(s)}`,
    size ? `📏 Talla: ${fullSizeLabel(size)}` : `📏 Talla: (por confirmar)`,
    `💵 Precio: ${formatPrice(finalPrice(s))}`,
  ];
  if (pageUrl) lines.push(``, pageUrl);
  return lines.join("\n");
}

/* ---------- Tallas ---------- */

export const SIZE_SYSTEMS: { key: SizeSystem; label: string }[] = [
  { key: "us", label: "US" },
  { key: "eu", label: "EU" },
  { key: "uk", label: "UK" },
  { key: "cm", label: "CM" },
];

/** "US 9 · EU 42.5 · UK 8 · 27 cm" (omite los sistemas vacíos). */
export function fullSizeLabel(size: Size): string {
  return SIZE_SYSTEMS.filter((sys) => size[sys.key])
    .map((sys) => (sys.key === "cm" ? `${size.cm} cm` : `${sys.label} ${size[sys.key]}`))
    .join(" · ");
}

/** "11", "11.0", "11,5" -> número; vacío o texto -> null. */
function parseSize(t: string): number | null {
  const n = parseFloat(t.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * ¿La talla que escribió el cliente coincide con esta? Con números de 30 en adelante se
 * entiende que es europea (42, 44.5); por debajo, americana (9, 11).
 */
export function matchesSize(size: Size, typed: string): boolean {
  const n = parseSize(typed);
  if (n == null) return false;
  const value = parseSize(n >= 30 ? size.eu : size.us);
  return value === n;
}

// Tablas de referencia (estándar Nike/Jordan). Se usan solo para autocompletar
// en el admin; cada valor se puede corregir a mano porque varían por marca.
type Row = [us: string, uk: string, eu: string, cm: string];

const MEN: Row[] = [
  ["3.5", "3", "35.5", "22.5"], ["4", "3.5", "36", "23"], ["4.5", "4", "36.5", "23.5"],
  ["5", "4.5", "37.5", "23.5"], ["5.5", "5", "38", "24"], ["6", "5.5", "38.5", "24"],
  ["6.5", "6", "39", "24.5"], ["7", "6", "40", "25"], ["7.5", "6.5", "40.5", "25.5"],
  ["8", "7", "41", "26"], ["8.5", "7.5", "42", "26.5"], ["9", "8", "42.5", "27"],
  ["9.5", "8.5", "43", "27.5"], ["10", "9", "44", "28"], ["10.5", "9.5", "44.5", "28.5"],
  ["11", "10", "45", "29"], ["11.5", "10.5", "45.5", "29.5"], ["12", "11", "46", "30"],
  ["12.5", "11.5", "47", "30.5"], ["13", "12", "47.5", "31"], ["14", "13", "48.5", "32"],
  ["15", "14", "49.5", "33"],
];

const WOMEN: Row[] = [
  ["5", "2.5", "35.5", "22"], ["5.5", "3", "36", "22.5"], ["6", "3.5", "36.5", "23"],
  ["6.5", "4", "37.5", "23.5"], ["7", "4.5", "38", "24"], ["7.5", "5", "38.5", "24.5"],
  ["8", "5.5", "39", "25"], ["8.5", "6", "40", "25.5"], ["9", "6.5", "40.5", "26"],
  ["9.5", "7", "41", "26.5"], ["10", "7.5", "42", "27"], ["10.5", "8", "42.5", "27.5"],
  ["11", "8.5", "43", "28"], ["11.5", "9", "44", "28.5"], ["12", "9.5", "44.5", "29"],
];

/** Dada una talla US, sugiere EU/UK/CM según el género. */
export function suggestSize(us: string, gender: Gender): Size {
  const clean = us.trim().replace(",", ".");
  const table = gender === "mujer" ? WOMEN : MEN;
  const row = table.find((r) => r[0] === clean);
  return {
    us: clean,
    uk: row?.[1] ?? "",
    eu: row?.[2] ?? "",
    cm: row?.[3] ?? "",
    available: true,
  };
}

export function sortSizes(sizes: Size[]): Size[] {
  return [...sizes].sort((a, b) => parseFloat(a.us) - parseFloat(b.us));
}

/* ---------- Varios ---------- */

export function availableSizes(s: Sneaker): Size[] {
  return s.sizes.filter((z) => z.available);
}

export function isSoldOut(s: Sneaker): boolean {
  return s.status === "agotado" || availableSizes(s).length === 0;
}

export function normalizeText(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
