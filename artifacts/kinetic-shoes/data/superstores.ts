import { ImageSourcePropType } from "react-native";

export type ShopType = "Super Store" | "Basic Store" | "Vendor";

export interface StoreProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: ImageSourcePropType;
  category: string;
  rating: number;
  reviews: number;
  availableItems: number;
  description: string;
  shopType: ShopType;
  shopId: string;
  shopName: string;
  tags: string[];
}

export interface SuperStore {
  id: string;
  name: string;
  tagline: string;
  category: string;
  emoji: string;
  accentColor: string;
  coverGradient: [string, string];
  coverImage?: ReturnType<typeof require>;
  rating: number;
  reviews: number;
  totalProducts: number;
  followers: string;
  isVerified: boolean;
  openNow: boolean;
  deliveryTime: string;
  minOrder: number;
}

export const SUPER_STORES: SuperStore[] = [];
export const STORE_PRODUCTS: StoreProduct[] = [];
