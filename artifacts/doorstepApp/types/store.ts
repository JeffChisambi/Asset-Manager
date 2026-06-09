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
  shopType?: string;
  shopName?: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  tagline: string;
  description?: string;
  emoji: string;
  accent_color: string;
  cover_gradient_start: string;
  cover_gradient_end: string;
  cover_image_url?: string;
  logo_url?: string;
  merchant_type: MerchantType;
  rating?: number;
  reviews?: number;
  followers?: number;
  is_active?: boolean; // false = deactivated (hidden from marketplace)
  created_at?: string;
  updated_at?: string;
  products?: StoreProduct[]; // joined relation
}

export interface StoreReview {
  id: number;
  rating: number;
  text: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

/** Live aggregate stats returned by the backend after every mutation. */
export interface StoreStats {
  rating: number;
  reviews: number;
  followers: number;
}

export interface StoreInteractionStatus {
  isFollowing: boolean;
  userReview: StoreReview | null;
  stats: StoreStats;
}

