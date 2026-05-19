import { useState, useCallback, useEffect } from "react";
import { Store } from "@/types/store";
import { StoreService } from "@/services/store/store.service";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useStore(ownerId?: string) {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    if (!ownerId) {
      setStores([]);
      setActiveStore(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await StoreService.getStoresByOwnerId(ownerId);
      setStores(data);
      
      // Load active store ID preference from AsyncStorage if it exists
      const savedActiveId = await AsyncStorage.getItem(`active_store_id_${ownerId}`);
      if (savedActiveId && data.some(s => s.id === savedActiveId)) {
        setActiveStore(data.find(s => s.id === savedActiveId) || data[0] || null);
      } else {
        setActiveStore(data[0] || null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load stores");
    } finally {
      setIsLoading(false);
    }
  }, [ownerId]);

  const selectActiveStore = useCallback(async (storeId: string) => {
    if (!ownerId) return;
    const found = stores.find(s => s.id === storeId);
    if (found) {
      setActiveStore(found);
      await AsyncStorage.setItem(`active_store_id_${ownerId}`, storeId);
    }
  }, [stores, ownerId]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return {
    stores,
    store: activeStore, // backward-compatible alias
    activeStore,
    isLoading,
    error,
    refreshStore: fetchStores,
    selectActiveStore,
  };
}
