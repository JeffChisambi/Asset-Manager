import AsyncStorage from "@react-native-async-storage/async-storage";
import { Store, StoreProduct } from "@/types/store";
import { IStoreRepository, SupabaseStoreRepository } from "./store.repository";

export abstract class BaseStoreService {
  protected repository: IStoreRepository;

  constructor(repository: IStoreRepository) {
    this.repository = repository;
  }

  abstract getStoreByOwnerId(ownerId: string): Promise<Store | null>;
  abstract getStoresByOwnerId(ownerId: string): Promise<Store[]>;
  abstract createStore(storeData: Partial<Store>): Promise<Store>;

  abstract updateStore(storeId: string, storeData: Partial<Store>): Promise<Store>;
  abstract deleteStore(storeId: string, ownerId: string): Promise<void>;
  
  abstract addStoreProduct(product: Partial<StoreProduct>): Promise<StoreProduct>;
  abstract removeStoreProduct(productId: string): Promise<void>;
  
  abstract searchStores(query?: string, merchantType?: string): Promise<Store[]>;
  abstract globalSearch(query: string): Promise<{ stores: Store[], products: StoreProduct[] }>;
  abstract linkStoreToProfile(storeId: string, chatProfileId: string, merchantId: string): Promise<Store | null>;
}

// ─── Local persistence helpers ────────────────────────────────────────────────
function storeKey(ownerId: string) {
  return `store_data_${ownerId}`;
}

async function loadLocalStore(ownerId: string): Promise<Store | null> {
  try {
    const raw = await AsyncStorage.getItem(storeKey(ownerId));
    return raw ? (JSON.parse(raw) as Store) : null;
  } catch {
    return null;
  }
}

async function saveLocalStore(ownerId: string, data: Store): Promise<void> {
  try {
    await AsyncStorage.setItem(storeKey(ownerId), JSON.stringify(data));
    await saveToLocalStoreList(ownerId, data);
  } catch {}
}

async function saveToLocalStoreList(ownerId: string, data: Store): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(`stores_list_${ownerId}`);
    let list: Store[] = raw ? JSON.parse(raw) : [];
    
    const index = list.findIndex(s => s.id === data.id);
    if (index >= 0) {
      list[index] = data;
    } else {
      list.unshift(data); // Prepend new stores so they show up first
    }
    await AsyncStorage.setItem(`stores_list_${ownerId}`, JSON.stringify(list));
  } catch {}
}

async function deleteLocalStore(ownerId: string, storeId?: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storeKey(ownerId));
    if (storeId) {
      const raw = await AsyncStorage.getItem(`stores_list_${ownerId}`);
      if (raw) {
        let list: Store[] = JSON.parse(raw);
        list = list.filter(s => s.id !== storeId);
        await AsyncStorage.setItem(`stores_list_${ownerId}`, JSON.stringify(list));
      }
    }
  } catch {}
}

export class StoreServiceImpl extends BaseStoreService {
  async getStoreByOwnerId(ownerId: string): Promise<Store | null> {
    try {
      const dbStore = await this.repository.getStoreByOwnerId(ownerId);
      if (dbStore) {
        // Sync local
        await saveLocalStore(ownerId, dbStore);
        return dbStore;
      }
    } catch {
      // Supabase may fail, fallback to local
    }
    return await loadLocalStore(ownerId);
  }

  async getStoresByOwnerId(ownerId: string): Promise<Store[]> {
    try {
      const dbStores = await this.repository.getStoresByOwnerId(ownerId);
      if (dbStores && dbStores.length > 0) {
        await AsyncStorage.setItem(`stores_list_${ownerId}`, JSON.stringify(dbStores));
        return dbStores;
      }
    } catch (e) {
      console.log("Supabase getStoresByOwnerId failed:", e);
    }
    try {
      const raw = await AsyncStorage.getItem(`stores_list_${ownerId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async createStore(storeData: Partial<Store>): Promise<Store> {
    const ownerId = storeData.owner_id;
    if (!ownerId) throw new Error("Owner ID is required to create a store");

    const fullStoreData = {
      ...storeData,
      id: storeData.id || Date.now().toString(),
      products: storeData.products || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let createdDbStore: Store | null = null;
    try {
      createdDbStore = await this.repository.createStore(storeData);
    } catch {
      // Ignored for local fallback
    }

    const finalStore = createdDbStore || fullStoreData as Store;
    await saveLocalStore(ownerId, finalStore);
    return finalStore;
  }

  async updateStore(storeId: string, storeData: Partial<Store>): Promise<Store> {
    let updatedDbStore: Store | null = null;
    try {
      updatedDbStore = await this.repository.updateStore(storeId, storeData);
    } catch {
      // Ignored for local fallback
    }

    if (updatedDbStore && updatedDbStore.owner_id) {
      await saveLocalStore(updatedDbStore.owner_id, updatedDbStore);
      return updatedDbStore;
    }

    // Fallback logic
    if (storeData.owner_id) {
      const existing = await loadLocalStore(storeData.owner_id);
      if (existing) {
        const updated = { ...existing, ...storeData, updated_at: new Date().toISOString() };
        await saveLocalStore(storeData.owner_id, updated);
        return updated;
      }
    }

    throw new Error("Could not update store locally or remotely");
  }

  async deleteStore(storeId: string, ownerId: string): Promise<void> {
    try {
      await this.repository.deleteStore(storeId);
    } catch {}
    await deleteLocalStore(ownerId, storeId);
  }

  async addStoreProduct(product: Partial<StoreProduct>): Promise<StoreProduct> {
    // We attempt to add it to DB if store is mapped to DB.
    try {
       return await this.repository.addStoreProduct(product);
    } catch {
       return {
         ...product,
         id: Date.now().toString(),
         created_at: new Date().toISOString()
       } as StoreProduct;
    }
  }

  async removeStoreProduct(productId: string): Promise<void> {
    try {
      await this.repository.removeStoreProduct(productId);
    } catch {}
  }

  async searchStores(query?: string, merchantType?: string): Promise<Store[]> {
    try {
      const dbStores = await this.repository.searchStores(query, merchantType);
      if (dbStores) {
        return dbStores;
      }
    } catch {
      // Supabase failed, fallback to local storage
    }

    try {
      const keys = await AsyncStorage.getAllKeys();
      const listKeys = keys.filter(k => k.startsWith('stores_list_'));
      let allStores: Store[] = [];
      
      for (const k of listKeys) {
        const raw = await AsyncStorage.getItem(k);
        if (raw) {
          const list: Store[] = JSON.parse(raw);
          allStores = allStores.concat(list);
        }
      }
      
      let filtered = allStores;
      if (merchantType) {
        filtered = filtered.filter(s => s.merchant_type === merchantType);
      }
      if (query) {
        const lowerQ = query.toLowerCase();
        filtered = filtered.filter(s => s.name?.toLowerCase().includes(lowerQ));
      }
      
      // Sort newest first
      filtered.sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      });
      
      return filtered;
    } catch (e) {
      console.error("Local searchStores fallback failed:", e);
      return [];
    }
  }

  async globalSearch(query: string): Promise<{ stores: Store[], products: StoreProduct[] }> {
    try {
      return await this.repository.globalSearch(query);
    } catch (e) {
      console.error("StoreService.globalSearch failed:", e);
      return { stores: [], products: [] };
    }
  }

  async linkStoreToProfile(storeId: string, chatProfileId: string, merchantId: string): Promise<Store | null> {
    try {
      return await this.repository.linkStoreToProfile(storeId, chatProfileId, merchantId);
    } catch (e) {
      console.error("StoreService.linkStoreToProfile failed:", e);
      return null;
    }
  }
}

export const StoreService = new StoreServiceImpl(new SupabaseStoreRepository());
