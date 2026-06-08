import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_SEARCHES_KEY = "search_recent_v1";
const MAX_RECENT = 12;

interface SearchContextValue {
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

const SearchContext = createContext<SearchContextValue>({
  recentSearches: [],
  addRecentSearch: () => {},
  removeRecentSearch: () => {},
  clearRecentSearches: () => {},
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((raw) => {
        if (raw) setRecentSearches(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((searches: string[]) => {
    AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches)).catch(() => {});
  }, []);

  const addRecentSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || trimmed.length < 2) return;
      setRecentSearches((prev) => {
        const filtered = prev.filter(
          (s) => s.toLowerCase() !== trimmed.toLowerCase()
        );
        const next = [trimmed, ...filtered].slice(0, MAX_RECENT);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeRecentSearch = useCallback(
    (query: string) => {
      setRecentSearches((prev) => {
        const next = prev.filter((s) => s !== query);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
  }, []);

  return (
    <SearchContext.Provider
      value={{
        recentSearches,
        addRecentSearch,
        removeRecentSearch,
        clearRecentSearches,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  return useContext(SearchContext);
}
