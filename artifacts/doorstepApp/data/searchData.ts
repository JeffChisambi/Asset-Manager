/**
 * Unified searchable entity catalog for the Doorstep platform.
 * All entities across Products, Stores, Professionals, Services, and Categories
 * are indexed here for the intelligent search engine.
 */

export type EntityType =
  | "product"
  | "store"
  | "professional"
  | "service"
  | "category";

export interface SearchEntity {
  id: string;
  type: EntityType;
  title: string;
  subtitle: string;
  tags: string[];
  keywords: string[];
  popularityScore: number; // 0–100
  rating: number; // 0–5
  reviewCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  price?: number;
  currency?: string;
  imageUrl?: string;
  accentColor?: string;
  badge?: string; // "Super Store" | "Basic Store" | "Vendor" | "Pro"
  location?: string;
  distance?: number; // km from user
  deliveryTime?: string;
  openNow?: boolean;
  route?: string; // navigation path
}

// ─── Products ──────────────────────────────────────────────────────────────────

export const SEARCH_PRODUCTS: SearchEntity[] = [];

// Stores ────────────────────────────────────────────────────────────────────

export const SEARCH_STORES: SearchEntity[] = [];

// Professionals ─────────────────────────────────────────────────────────────

export const SEARCH_PROFESSIONALS: SearchEntity[] = [];

// ─── Services ──────────────────────────────────────────────────────────────────

export const SEARCH_SERVICES: SearchEntity[] = [];

// ─── Categories ────────────────────────────────────────────────────────────────

export const SEARCH_CATEGORIES: SearchEntity[] = [];

// ─── Unified Index ─────────────────────────────────────────────────────────────

export const ALL_ENTITIES: SearchEntity[] = [];

// ─── Trending Searches ─────────────────────────────────────────────────────────

export const TRENDING_SEARCHES: string[] = [
  "Food delivery",
  "Graphic designer",
  "Laptop repair",
  "Phone repair",
  "Poster design",
];
