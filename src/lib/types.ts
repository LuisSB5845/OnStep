export type SizeSystem = "us" | "eu" | "uk" | "cm";

export type Size = {
  us: string;
  eu: string;
  uk: string;
  cm: string;
  available: boolean;
};

export type Gender = "hombre" | "mujer" | "unisex" | "niños";
export type Status = "disponible" | "agotado" | "oculto";

export type Sneaker = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  sale_price: number | null;
  gender: Gender;
  status: Status;
  featured: boolean;
  sizes: Size[];
  images: string[];
  created_at: string;
  updated_at: string;
};

export type Business = {
  name: string;
  tagline: string;
  about: string;
  whatsapp: string;
  location: string;
  hours: string;
  facebook: string;
  instagram: string;
};
