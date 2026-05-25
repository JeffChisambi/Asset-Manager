export type MerchantType = "basic_shop" | "vendor" | "professional" | "super_store";

export interface StoreProduct {
  id: string;
  store_id: string;
  name: string;
  price: number;
  brand?: string;
  rating?: number;
  category?: string;
  image_url?: string;
  availableItems?: number;
  stock?: number;
  created_at?: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  tagline: string;
  emoji: string;
  accent_color: string;
  cover_gradient_start: string;
  cover_gradient_end: string;
  cover_image_url?: string;
  merchant_type: MerchantType;
  rating?: number;
  is_active?: boolean; // false = deactivated (hidden from marketplace)
  created_at?: string;
  updated_at?: string;
  products?: StoreProduct[]; // joined relation
}
