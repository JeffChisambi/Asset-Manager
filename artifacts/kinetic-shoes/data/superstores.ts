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

const nikeAir90    = require("@/assets/images/nike_air90.png");
const airJordan3   = require("@/assets/images/air_jordan3.png");
const nikeDunk     = require("@/assets/images/nike_dunk.png");
const adidasNmd    = require("@/assets/images/adidas_nmd.png");
const bannerShoe   = require("@/assets/images/banner_shoe.png");

// FreshMart Hypermarket images
const freshMartCover  = require("@/assets/freshmart hypermarket/freshmartcover.png");
const freshMartApples = require("@/assets/freshmart hypermarket/apples.png");
const freshMartIceCream = require("@/assets/freshmart hypermarket/icecream.png");
const freshMartPizza  = require("@/assets/freshmart hypermarket/pizza.png");

export const SUPER_STORES: SuperStore[] = [
  {
    id: "sportsmega",
    name: "SportsMega Mall",
    tagline: "Your ultimate sports destination",
    category: "Sports & Footwear",
    emoji: "🏆",
    accentColor: "#4A80F0",
    coverGradient: ["#1a1a2e", "#4A80F0"],
    rating: 4.8,
    reviews: 2340,
    totalProducts: 340,
    followers: "12.4K",
    isVerified: true,
    openNow: true,
    deliveryTime: "30–50 min",
    minOrder: 25,
  },
  {
    id: "techworld",
    name: "TechWorld Mall",
    tagline: "Next-gen gadgets & electronics",
    category: "Electronics",
    emoji: "📱",
    accentColor: "#0F3460",
    coverGradient: ["#0F3460", "#533483"],
    rating: 4.7,
    reviews: 1870,
    totalProducts: 580,
    followers: "8.9K",
    isVerified: true,
    openNow: true,
    deliveryTime: "1–2 hrs",
    minOrder: 50,
  },
  {
    id: "furnitura",
    name: "FurnitureMega Mall",
    tagline: "Beautiful spaces, beautiful living",
    category: "Furniture & Home",
    emoji: "🛋️",
    accentColor: "#8B6914",
    coverGradient: ["#2C1810", "#8B6914"],
    rating: 4.6,
    reviews: 980,
    totalProducts: 210,
    followers: "5.2K",
    isVerified: true,
    openNow: false,
    deliveryTime: "2–5 days",
    minOrder: 100,
  },
  {
    id: "freshmart",
    name: "FreshMart Hypermarket",
    tagline: "Farm fresh, delivered to you",
    category: "Food & Groceries",
    emoji: "🛒",
    accentColor: "#4CAF50",
    coverGradient: ["#1B4332", "#4CAF50"],
    coverImage: freshMartCover,
    rating: 4.9,
    reviews: 4210,
    totalProducts: 1200,
    followers: "28.1K",
    isVerified: true,
    openNow: true,
    deliveryTime: "20–40 min",
    minOrder: 15,
  },
];

export const STORE_PRODUCTS: StoreProduct[] = [
  // SportsMega Mall
  {
    id: "sm-1", shopId: "sportsmega", shopName: "SportsMega Mall", shopType: "Super Store",
    name: "Nike Air Max 90", brand: "Nike", price: 225, originalPrice: 280,
    image: nikeAir90, category: "Footwear", rating: 4.8, reviews: 312,
    availableItems: 14, description: "Iconic comfort with Air Max cushioning. Built for everyday wear.", tags: ["Trending", "Sale"],
  },
  {
    id: "sm-2", shopId: "sportsmega", shopName: "SportsMega Mall", shopType: "Super Store",
    name: "Air Jordan 3 Retro", brand: "Jordan", price: 200,
    image: airJordan3, category: "Footwear", rating: 4.9, reviews: 540,
    availableItems: 6, description: "A classic reimagined with premium materials and legendary heritage.", tags: ["Classic"],
  },
  {
    id: "sm-3", shopId: "sportsmega", shopName: "SportsMega Mall", shopType: "Super Store",
    name: "Nike Dunk Low", brand: "Nike", price: 180, originalPrice: 200,
    image: nikeDunk, category: "Footwear", rating: 4.7, reviews: 218,
    availableItems: 22, description: "Street-ready silhouette with a low-top profile. Perfect for everyday style.", tags: ["Popular", "Sale"],
  },
  {
    id: "sm-4", shopId: "sportsmega", shopName: "SportsMega Mall", shopType: "Super Store",
    name: "Adidas NMD R1", brand: "Adidas", price: 165,
    image: adidasNmd, category: "Footwear", rating: 4.6, reviews: 189,
    availableItems: 9, description: "Futuristic design meets responsive cushioning for all-day comfort.", tags: ["New Arrival"],
  },
  {
    id: "sm-5", shopId: "sportsmega", shopName: "SportsMega Mall", shopType: "Super Store",
    name: "Nike Air Force 1", brand: "Nike", price: 140,
    image: nikeAir90, category: "Footwear", rating: 4.7, reviews: 723,
    availableItems: 30, description: "The legendary basketball icon. Now a street fashion staple.", tags: ["Best Seller"],
  },
  {
    id: "sm-6", shopId: "sportsmega", shopName: "SportsMega Mall", shopType: "Super Store",
    name: "Jordan Retro High", brand: "Jordan", price: 210, originalPrice: 240,
    image: bannerShoe, category: "Footwear", rating: 4.8, reviews: 415,
    availableItems: 4, description: "High-top excellence in a vintage-inspired palette.", tags: ["Limited", "Sale"],
  },

  // TechWorld Mall
  {
    id: "tw-1", shopId: "techworld", shopName: "TechWorld Mall", shopType: "Super Store",
    name: "Sony WF-1000XM5", brand: "Sony", price: 299,
    image: adidasNmd, category: "Audio", rating: 4.9, reviews: 876,
    availableItems: 25, description: "Industry-leading noise cancellation with premium sound quality.", tags: ["Best Seller"],
  },
  {
    id: "tw-2", shopId: "techworld", shopName: "TechWorld Mall", shopType: "Super Store",
    name: "Samsung Galaxy Watch 6", brand: "Samsung", price: 349, originalPrice: 399,
    image: nikeDunk, category: "Wearables", rating: 4.7, reviews: 423,
    availableItems: 10, description: "Track your fitness, stay connected, and look great doing it.", tags: ["Sale"],
  },
  {
    id: "tw-3", shopId: "techworld", shopName: "TechWorld Mall", shopType: "Super Store",
    name: "Anker PowerCore 26800", brand: "Anker", price: 59.99,
    image: adidasNmd, category: "Accessories", rating: 4.8, reviews: 1230,
    availableItems: 50, description: "Massive 26800mAh capacity to charge your devices multiple times.", tags: ["Popular"],
  },
  {
    id: "tw-4", shopId: "techworld", shopName: "TechWorld Mall", shopType: "Super Store",
    name: "iPad Pro 12.9-inch", brand: "Apple", price: 1099,
    image: nikeDunk, category: "Tablets", rating: 4.9, reviews: 654,
    availableItems: 8, description: "The ultimate iPad experience with M2 chip and Liquid Retina display.", tags: ["Premium"],
  },

  // FreshMart Hypermarket
  {
    id: "fm-1", shopId: "freshmart", shopName: "FreshMart Hypermarket", shopType: "Super Store",
    name: "Organic Fruit Bundle", brand: "FreshMart", price: 29.99,
    image: freshMartApples, category: "Fruits & Veg", rating: 4.9, reviews: 2100,
    availableItems: 80, description: "Hand-picked seasonal apples and assorted fruits sourced directly from local farmers. Always fresh, always organic.", tags: ["Organic", "Fresh"],
  },
  {
    id: "fm-2", shopId: "freshmart", shopName: "FreshMart Hypermarket", shopType: "Super Store",
    name: "Artisan Pizza", brand: "FreshMart Bakery", price: 18.99,
    image: freshMartPizza, category: "Ready Meals", rating: 4.8, reviews: 1340,
    availableItems: 25, description: "Stone-baked artisan pizza with premium toppings. Ready to heat and serve in minutes.", tags: ["Popular", "Fresh"],
  },
  {
    id: "fm-3", shopId: "freshmart", shopName: "FreshMart Hypermarket", shopType: "Super Store",
    name: "Premium Ice Cream 2L", brand: "FreshMart Dairy", price: 12.50,
    image: freshMartIceCream, category: "Dairy & Frozen", rating: 4.7, reviews: 980,
    availableItems: 60, description: "Rich, creamy premium ice cream available in a range of flavours. Made with real milk and natural ingredients.", tags: ["Best Seller"],
  },
  {
    id: "fm-4", shopId: "freshmart", shopName: "FreshMart Hypermarket", shopType: "Super Store",
    name: "Premium Spice Collection", brand: "SpiceWorld", price: 14.99,
    image: freshMartApples, category: "Spices & Condiments", rating: 4.7, reviews: 890,
    availableItems: 42, description: "12 exotic spices to elevate your cooking to restaurant level.", tags: ["Popular"],
  },
];
