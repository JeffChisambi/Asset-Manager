import { useState, useEffect, useRef, useCallback } from "react";
import { SearchEntity, EntityType } from "@/data/searchData";
import { expandQuery } from "@/data/synonyms";
import { StoreService } from "@/services/store/store.service";

// ─── Levenshtein Distance ─────────────────────────────────────────────────────

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen > 20) {
    // Skip expensive edit distance for very long strings
    return maxLen;
  }

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreEntity(entity: SearchEntity, searchTerms: string[]): number {
  if (searchTerms.length === 0) return entity.popularityScore;

  let score = 0;
  const titleLower = entity.title.toLowerCase();
  const subtitleLower = entity.subtitle.toLowerCase();
  const allTags = entity.tags.map((t) => t.toLowerCase());
  const allKeywords = entity.keywords.map((k) => k.toLowerCase());

  for (const term of searchTerms) {
    const termLen = term.length;
    if (termLen < 2) continue;

    // Exact title match — highest weight
    if (titleLower === term) {
      score += 120;
      continue;
    }

    // Title starts with term
    if (titleLower.startsWith(term)) {
      score += 90;
    } else if (titleLower.includes(term)) {
      score += 60;
    } else {
      // Fuzzy match on title words
      const titleWords = titleLower.split(/\s+/);
      for (const word of titleWords) {
        const dist = editDistance(word, term);
        const wordLen = Math.max(word.length, termLen);
        if (dist === 0) score += 55;
        else if (dist === 1 && wordLen >= 4) score += 35;
        else if (dist === 2 && wordLen >= 6) score += 20;
      }
    }

    // Subtitle match
    if (subtitleLower.includes(term)) score += 25;

    // Tag matches
    for (const tag of allTags) {
      if (tag === term) {
        score += 45;
      } else if (tag.includes(term) || term.includes(tag)) {
        score += 28;
      } else if (editDistance(tag, term) <= 1 && Math.max(tag.length, termLen) >= 4) {
        score += 18;
      }
    }

    // Keyword matches
    for (const kw of allKeywords) {
      if (kw === term) {
        score += 30;
      } else if (kw.includes(term) || term.includes(kw)) {
        score += 18;
      }
    }
  }

  if (score === 0) return 0;

  // Boost signals
  score += entity.popularityScore * 0.15;
  if (entity.isVerified) score += 12;
  if (entity.isFeatured) score += 8;
  score += entity.rating * 4;

  return score;
}

// ─── Intent Detection ─────────────────────────────────────────────────────────

const LOCATION_SIGNALS = ["near me", "nearby", "close", "closest", "around"];
const PRICE_SIGNALS = ["cheap", "affordable", "budget", "low price", "cheapest", "sale", "discount"];
const PROFESSIONAL_SIGNALS = [
  "designer", "developer", "plumber", "electrician", "technician",
  "photographer", "tailor", "driver", "cleaner", "mechanic",
  "who", "someone who", "person who",
];
const SERVICE_SIGNALS = ["repair", "fix", "design", "install", "clean", "deliver", "build", "teach"];

export interface SearchIntent {
  isGeo: boolean;
  isPriceSensitive: boolean;
  isProfessional: boolean;
  isService: boolean;
}

function detectIntent(query: string, expandedTerms: string[]): SearchIntent {
  const q = query.toLowerCase();
  const combined = [q, ...expandedTerms].join(" ");

  return {
    isGeo: LOCATION_SIGNALS.some((s) => combined.includes(s)),
    isPriceSensitive: PRICE_SIGNALS.some((s) => combined.includes(s)),
    isProfessional: PROFESSIONAL_SIGNALS.some((s) => combined.includes(s)),
    isService: SERVICE_SIGNALS.some((s) => combined.includes(s)),
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
  intent: SearchIntent | null;
  query: string;
  setQuery: (q: string) => void;
  activeFilter: EntityType | "all";
  setActiveFilter: (f: EntityType | "all") => void;
  counts: Record<EntityType | "all", number>;
}

const DEBOUNCE_MS = 280;

export function useSearch(): UseSearchReturn {
  const [query, setQueryState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<EntityType | "all">("all");
  const [loading, setLoading] = useState(false);
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
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

  const [intent, setIntent] = useState<SearchIntent | null>(null);

  useEffect(() => {
    let active = true;

    if (!debouncedQuery) {
      setAllResults([]);
      setLoading(false);
      setIntent(null);
      return;
    }

    async function doSearch() {
      const expandedTerms = expandQuery(debouncedQuery);
      const detectedIntent = detectIntent(debouncedQuery, expandedTerms);
      if (!active) return;
      setIntent(detectedIntent);

      const scored: SearchResult[] = [];

      try {
        const { stores, products } = await StoreService.globalSearch(debouncedQuery);

        for (const store of stores) {
          const storeEntity: SearchEntity = {
            id: store.id,
            type: "store",
            title: store.name,
            subtitle: store.tagline || store.description || "Store",
            tags: [store.name],
            keywords: [store.name],
            popularityScore: 60,
            rating: 5.0,
            reviewCount: 0,
            isVerified: true,
            isFeatured: false,
            imageUrl: store.cover_image_url || undefined,
            accentColor: store.accent_color,
            badge: store.merchant_type === "basic_shop" ? "Basic Store" : "Vendor",
            route: `/store/${store.id}`
          };
          const ss = scoreEntity(storeEntity, expandedTerms);
          if (ss > 0) scored.push({ ...storeEntity, score: ss });
        }

        for (const p of products) {
          const prodEntity: SearchEntity = {
            id: p.id,
            type: "product",
            title: p.name,
            subtitle: p.shopName || "Store",
            tags: [p.name, p.category || ""],
            keywords: [p.name],
            popularityScore: 60,
            rating: p.rating || 5.0,
            reviewCount: 0,
            isVerified: true,
            isFeatured: false,
            price: p.price,
            imageUrl: p.image_url || undefined,
            badge: p.shopType || "Basic Store",
            route: `/product/${p.id}`
          };
          const ps = scoreEntity(prodEntity, expandedTerms);
          if (ps > 0) scored.push({ ...prodEntity, score: ps });
        }
      } catch (err) {
        console.warn("Global search failed", err);
      }

      if (!active) return;

      // Sort: score descending, then popularity, then rating
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.popularityScore !== a.popularityScore)
          return b.popularityScore - a.popularityScore;
        return b.rating - a.rating;
      });

      setAllResults(scored);
      setLoading(false);
    }

    doSearch();
    return () => { active = false; };
  }, [debouncedQuery]);

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
    intent,
    query,
    setQuery,
    activeFilter,
    setActiveFilter,
    counts,
  };
}
