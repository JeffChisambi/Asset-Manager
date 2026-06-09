import { useState, useEffect, useRef, useCallback } from "react";
import { SearchEntity, EntityType } from "@/data/searchData";
import { resolveImageUrl } from "@/utils/url";
import { StoreService } from "@/services/store/store.service";

// ─── Intent Detection ─────────────────────────────────────────────────────────

const LOCATION_SIGNALS = ["near me", "nearby", "close", "closest", "around"];
const PRICE_SIGNALS = ["cheap", "affordable", "budget", "low price", "cheapest", "sale", "discount"];
const PROFESSIONAL_SIGNALS = [
  "designer", "developer", "plumber", "electrician", "technician",
  "photographer", "tailor", "driver", "cleaner", "mechanic",
];
const SERVICE_SIGNALS = ["repair", "fix", "design", "install", "clean", "deliver", "build", "teach"];

export interface SearchIntent {
  isGeo: boolean;
  isPriceSensitive: boolean;
  isProfessional: boolean;
  isService: boolean;
}

function detectIntent(query: string): SearchIntent {
  const q = query.toLowerCase();
  return {
    isGeo: LOCATION_SIGNALS.some((s) => q.includes(s)),
    isPriceSensitive: PRICE_SIGNALS.some((s) => q.includes(s)),
    isProfessional: PROFESSIONAL_SIGNALS.some((s) => q.includes(s)),
    isService: SERVICE_SIGNALS.some((s) => q.includes(s)),
  };
}

// ─── Main Search Hook ─────────────────────────────────────────────────────────

export interface SearchResult extends SearchEntity {
  score: number;
}

export interface UseSearchReturn {
  results: SearchResult[];
  allResults: SearchResult[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  intent: SearchIntent | null;
  query: string;
  setQuery: (q: string) => void;
  activeFilter: EntityType | "all";
  setActiveFilter: (f: EntityType | "all") => void;
  counts: Record<EntityType | "all", number>;
  loadMore: () => void;
}

const DEBOUNCE_MS = 300;
const LIMIT_PER_PAGE = 20;

export function useSearch(): UseSearchReturn {
  const [query, setQueryState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<EntityType | "all">("all");
  
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [intent, setIntent] = useState<SearchIntent | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setLoading(q.trim().length > 0);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (q.trim().length === 0) {
      setDebouncedQuery("");
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      setDebouncedQuery(q.trim());
    }, DEBOUNCE_MS);
  }, []);

  const fetchResults = async (q: string, p: number, append: boolean) => {
    try {
      const { stores, products } = await StoreService.globalSearch(q, p, LIMIT_PER_PAGE);

      const scored: SearchResult[] = [];

      for (const store of stores) {
        scored.push({
          id: store.id.toString(),
          type: "store",
          title: store.name,
          subtitle: store.tagline || "Store",
          tags: [store.name],
          keywords: [store.name],
          popularityScore: 60,
          rating: store.rating || 5.0,
          reviewCount: store.reviews || 0,
          isVerified: true,
          isFeatured: false,
          imageUrl: resolveImageUrl(store.cover_image_url) || undefined,
          accentColor: store.accent_color || undefined,
          badge: store.merchant_type === "basic_shop" ? "Basic Store" : "Vendor",
          route: `/store/${store.id}`,
          score: 1, // Relevance is handled by backend ordering
        });
      }

      for (const prod of products) {
        scored.push({
          id: prod.id.toString(),
          type: "product",
          title: prod.name,
          subtitle: prod.storeId ? `Store ID: ${prod.storeId}` : "Store", // Real store names require more robust formatting 
          tags: [prod.name, prod.category || ""],
          keywords: [prod.name],
          popularityScore: 60,
          rating: prod.rating || 5.0,
          reviewCount: prod.reviews || 0,
          isVerified: true,
          isFeatured: false,
          price: prod.price,
          imageUrl: resolveImageUrl(prod.image_url) || undefined,
          badge: prod.shopType || "Basic Store",
          route: `/product/${prod.id}`,
          score: 1,
        });
      }

      const totalReturned = stores.length + products.length;
      // We know there's more if we got back exactly the limit. But since we do two independent queries on the backend, it's safer to just check if we got any results at all.
      setHasMore(totalReturned > 0);

      if (append) {
        setAllResults((prev) => {
          // Prevent duplicates
          const existingIds = new Set(prev.map(r => r.id + r.type));
          const newUnique = scored.filter(r => !existingIds.has(r.id + r.type));
          return [...prev, ...newUnique];
        });
      } else {
        setAllResults(scored);
      }
    } catch (err) {
      console.warn("Global search failed", err);
    }
  };

  // Initial Search
  useEffect(() => {
    let active = true;

    if (!debouncedQuery) {
      setAllResults([]);
      setLoading(false);
      setIntent(null);
      setPage(1);
      setHasMore(false);
      return;
    }

    async function doSearch() {
      if (!active) return;
      setIntent(detectIntent(debouncedQuery));
      setPage(1);
      
      await fetchResults(debouncedQuery, 1, false);

      if (!active) return;
      setLoading(false);
    }

    doSearch();
    return () => { active = false; };
  }, [debouncedQuery]);

  // Load More
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !debouncedQuery) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchResults(debouncedQuery, nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  }, [loading, loadingMore, hasMore, debouncedQuery, page]);

  // Filter by active type
  const results: SearchResult[] =
    activeFilter === "all"
      ? allResults
      : allResults.filter((r) => r.type === activeFilter);

  // Counts per type
  const counts = {
    all: allResults.length,
    product: allResults.filter((r) => r.type === "product").length,
    store: allResults.filter((r) => r.type === "store").length,
    professional: allResults.filter((r) => r.type === "professional").length,
    service: allResults.filter((r) => r.type === "service").length,
    category: allResults.filter((r) => r.type === "category").length,
  } as Record<EntityType | "all", number>;

  return {
    results,
    allResults,
    loading,
    loadingMore,
    hasMore,
    intent,
    query,
    setQuery,
    activeFilter,
    setActiveFilter,
    counts,
    loadMore,
  };
}
