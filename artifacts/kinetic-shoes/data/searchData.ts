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

export const SEARCH_PROFESSIONALS: SearchEntity[] = [
  {
    id: "pro-graphic-1",
    type: "professional",
    title: "Chisomo Creative Studio",
    subtitle: "Graphic Designer · Logo & Brand Identity",
    tags: ["graphic designer", "designer", "logo", "poster", "branding", "creative", "poster maker"],
    keywords: ["graphic", "design", "logo", "brand", "poster", "flyer", "creative", "visual"],
    popularityScore: 88,
    rating: 4.9,
    reviewCount: 312,
    isVerified: true,
    isFeatured: true,
    price: 35,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=400&q=80",
    accentColor: "#667EEA",
    badge: "Pro",
    location: "Lilongwe, Area 3",
    route: "/profile/pro-graphic-1",
  },
  {
    id: "pro-laptop-repair-1",
    type: "professional",
    title: "TechFix Solutions",
    subtitle: "Laptop & Computer Repair Specialist",
    tags: ["laptop repair", "computer repair", "technician", "fix", "screen", "kompyuta"],
    keywords: ["laptop", "repair", "computer", "technician", "fix", "screen", "battery", "windows"],
    popularityScore: 84,
    rating: 4.8,
    reviewCount: 198,
    isVerified: true,
    isFeatured: true,
    price: 25,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=400&q=80",
    accentColor: "#13B734",
    badge: "Pro",
    location: "Lilongwe, Area 18",
    route: "/profile/pro-laptop-repair-1",
  },
  {
    id: "pro-phone-repair-1",
    type: "professional",
    title: "QuickFix Phone Center",
    subtitle: "Phone Screen & Battery Replacement",
    tags: ["phone repair", "screen replacement", "battery", "foni", "mobile repair", "iphone", "samsung"],
    keywords: ["phone", "repair", "screen", "battery", "mobile", "iphone", "samsung", "tecno"],
    popularityScore: 86,
    rating: 4.7,
    reviewCount: 445,
    isVerified: true,
    isFeatured: true,
    price: 15,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80",
    accentColor: "#11998E",
    badge: "Pro",
    location: "Blantyre, Limbe",
    route: "/profile/pro-phone-repair-1",
  },
  {
    id: "pro-plumber-1",
    type: "professional",
    title: "ProPipe Plumbing",
    subtitle: "Certified Plumber · Fast Response",
    tags: ["plumber", "plumbing", "pipes", "water", "repairs", "installation"],
    keywords: ["plumber", "pipe", "water", "leak", "installation", "repair", "drain"],
    popularityScore: 72,
    rating: 4.6,
    reviewCount: 134,
    isVerified: true,
    isFeatured: false,
    price: 30,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    accentColor: "#56CCF2",
    badge: "Pro",
    location: "Lilongwe, Area 12",
    route: "/profile/pro-plumber-1",
  },
  {
    id: "pro-electrician-1",
    type: "professional",
    title: "BrightWire Electrical",
    subtitle: "Licensed Electrician · Solar & Wiring",
    tags: ["electrician", "electrical", "wiring", "solar", "installation", "power"],
    keywords: ["electrician", "electric", "wiring", "solar", "power", "installation", "fault"],
    popularityScore: 76,
    rating: 4.7,
    reviewCount: 167,
    isVerified: true,
    isFeatured: false,
    price: 40,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&q=80",
    accentColor: "#F9D423",
    badge: "Pro",
    location: "Lilongwe, Area 47",
    route: "/profile/pro-electrician-1",
  },
  {
    id: "pro-photographer-1",
    type: "professional",
    title: "LensArt Photography",
    subtitle: "Wedding & Event Photography",
    tags: ["photographer", "photography", "wedding", "event", "photos", "portraits"],
    keywords: ["photographer", "photo", "wedding", "event", "portrait", "studio", "camera"],
    popularityScore: 80,
    rating: 4.8,
    reviewCount: 203,
    isVerified: true,
    isFeatured: false,
    price: 120,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&q=80",
    accentColor: "#FC5C7D",
    badge: "Pro",
    location: "Lilongwe",
    route: "/profile/pro-photographer-1",
  },
  {
    id: "pro-tailor-1",
    type: "professional",
    title: "Madalo's Tailoring",
    subtitle: "Custom Clothing & Alterations",
    tags: ["tailor", "sewing", "alterations", "custom", "clothes", "zovala", "dressmaker"],
    keywords: ["tailor", "sew", "custom", "clothing", "alteration", "dress", "suit", "stitch"],
    popularityScore: 65,
    rating: 4.5,
    reviewCount: 98,
    isVerified: false,
    isFeatured: false,
    price: 20,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80",
    accentColor: "#C850C0",
    badge: "Pro",
    location: "Zomba",
    route: "/profile/pro-tailor-1",
  },
];

// ─── Services ──────────────────────────────────────────────────────────────────

export const SEARCH_SERVICES: SearchEntity[] = [
  {
    id: "svc-logo-design",
    type: "service",
    title: "Logo Design",
    subtitle: "Brand identity from scratch",
    tags: ["logo", "design", "branding", "graphic", "creative", "identity", "business"],
    keywords: ["logo", "brand", "design", "identity", "business", "creative", "vector"],
    popularityScore: 82,
    rating: 4.8,
    reviewCount: 287,
    isVerified: true,
    isFeatured: true,
    price: 50,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&q=80",
    accentColor: "#667EEA",
    badge: "Pro",
    route: "/services",
  },
  {
    id: "svc-poster-design",
    type: "service",
    title: "Poster & Flyer Design",
    subtitle: "Event, business & social media",
    tags: ["poster", "flyer", "design", "graphic", "event", "social media", "printing"],
    keywords: ["poster", "flyer", "design", "event", "social", "media", "print", "advertising"],
    popularityScore: 78,
    rating: 4.7,
    reviewCount: 341,
    isVerified: true,
    isFeatured: false,
    price: 25,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&q=80",
    accentColor: "#F953C6",
    badge: "Pro",
    route: "/services",
  },
  {
    id: "svc-laptop-repair",
    type: "service",
    title: "Laptop Repair",
    subtitle: "Screen, battery, software & more",
    tags: ["laptop repair", "computer", "fix", "screen", "battery", "windows", "software"],
    keywords: ["laptop", "repair", "fix", "screen", "battery", "windows", "virus", "data recovery"],
    popularityScore: 90,
    rating: 4.8,
    reviewCount: 523,
    isVerified: true,
    isFeatured: true,
    price: 25,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1588702547954-4800423f7571?w=400&q=80",
    accentColor: "#13B734",
    badge: "Pro",
    route: "/services",
  },
  {
    id: "svc-phone-repair",
    type: "service",
    title: "Phone Repair",
    subtitle: "Screen cracks, charging & software",
    tags: ["phone repair", "screen", "foni", "mobile", "iphone", "samsung", "crack"],
    keywords: ["phone", "repair", "screen", "crack", "charging", "battery", "water damage"],
    popularityScore: 93,
    rating: 4.7,
    reviewCount: 712,
    isVerified: true,
    isFeatured: true,
    price: 15,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&q=80",
    accentColor: "#11998E",
    badge: "Pro",
    route: "/services",
  },
  {
    id: "svc-delivery",
    type: "service",
    title: "Same-Day Delivery",
    subtitle: "Fast delivery within the city",
    tags: ["delivery", "fast", "same day", "courier", "logistics"],
    keywords: ["delivery", "courier", "fast", "same day", "logistics", "transport"],
    popularityScore: 88,
    rating: 4.6,
    reviewCount: 1102,
    isVerified: true,
    isFeatured: true,
    price: 5,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&q=80",
    accentColor: "#F7971E",
    badge: "Pro",
    route: "/services",
  },
  {
    id: "svc-web-dev",
    type: "service",
    title: "Website Development",
    subtitle: "Professional websites & apps",
    tags: ["web", "website", "developer", "app", "digital", "online", "business"],
    keywords: ["website", "web", "developer", "app", "ecommerce", "landing page", "design"],
    popularityScore: 74,
    rating: 4.7,
    reviewCount: 189,
    isVerified: true,
    isFeatured: false,
    price: 200,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=400&q=80",
    accentColor: "#4776E6",
    badge: "Pro",
    route: "/services",
  },
  {
    id: "svc-cleaning",
    type: "service",
    title: "Home Cleaning",
    subtitle: "Professional house cleaning service",
    tags: ["cleaning", "cleaner", "house", "home", "housekeeping", "domestic"],
    keywords: ["clean", "house", "home", "domestic", "maid", "sweep", "mop", "tidy"],
    popularityScore: 71,
    rating: 4.5,
    reviewCount: 223,
    isVerified: false,
    isFeatured: false,
    price: 20,
    currency: "USD",
    imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80",
    accentColor: "#56CCF2",
    badge: "Pro",
    route: "/services",
  },
];

// ─── Categories ────────────────────────────────────────────────────────────────

export const SEARCH_CATEGORIES: SearchEntity[] = [
  {
    id: "cat-electronics",
    type: "category",
    title: "Electronics",
    subtitle: "Phones, laptops & gadgets",
    tags: ["electronics", "phone", "laptop", "gadget", "foni", "kompyuta", "tech"],
    keywords: ["electronics", "phone", "laptop", "computer", "gadget", "tech", "digital"],
    popularityScore: 95,
    rating: 0,
    reviewCount: 0,
    isVerified: false,
    isFeatured: true,
    imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80",
    accentColor: "#0F3460",
    route: "/(tabs)",
  },
  {
    id: "cat-fashion",
    type: "category",
    title: "Clothing & Fashion",
    subtitle: "Shoes, clothes & accessories",
    tags: ["fashion", "clothing", "shoes", "nsapato", "zovala", "jeans", "dress", "style"],
    keywords: ["fashion", "clothing", "dress", "shoes", "accessories", "style", "wear"],
    popularityScore: 90,
    rating: 0,
    reviewCount: 0,
    isVerified: false,
    isFeatured: true,
    imageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80",
    accentColor: "#C850C0",
    route: "/(tabs)",
  },
  {
    id: "cat-food",
    type: "category",
    title: "Food & Groceries",
    subtitle: "Fresh produce & daily essentials",
    tags: ["food", "groceries", "chakudya", "fresh", "vegetables", "meat", "daily"],
    keywords: ["food", "grocery", "fresh", "vegetables", "meat", "daily", "essentials"],
    popularityScore: 88,
    rating: 0,
    reviewCount: 0,
    isVerified: false,
    isFeatured: true,
    imageUrl: "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=400&q=80",
    accentColor: "#FF6B35",
    route: "/(tabs)",
  },
  {
    id: "cat-services",
    type: "category",
    title: "Services & Professionals",
    subtitle: "Skilled experts near you",
    tags: ["services", "professional", "skilled", "expert", "repair", "design"],
    keywords: ["service", "professional", "expert", "skilled", "repair", "design", "fix"],
    popularityScore: 85,
    rating: 0,
    reviewCount: 0,
    isVerified: false,
    isFeatured: true,
    imageUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&q=80",
    accentColor: "#667EEA",
    route: "/services",
  },
];

// ─── Unified Index ─────────────────────────────────────────────────────────────

export const ALL_ENTITIES: SearchEntity[] = [
  ...SEARCH_PRODUCTS,
  ...SEARCH_STORES,
  ...SEARCH_PROFESSIONALS,
  ...SEARCH_SERVICES,
  ...SEARCH_CATEGORIES,
];

// ─── Trending Searches ─────────────────────────────────────────────────────────

export const TRENDING_SEARCHES: string[] = [
  "Food delivery",
  "Graphic designer",
  "Laptop repair",
  "Phone repair",
  "Poster design",
];
