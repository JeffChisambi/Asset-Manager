// Store repository for the Doorstep mobile app.
import { Platform } from "react-native";
import { Store, StoreProduct } from "@/types/store";

export interface IStoreRepository {
  getStoreByOwnerId(ownerId: string): Promise<Store | null>;
  getStoreById(storeId: string): Promise<Store | null>;
  getStoresByOwnerId(ownerId: string): Promise<Store[]>;
  createStore(storeData: Partial<Store>): Promise<Store>;
  updateStore(storeId: string, storeData: Partial<Store>): Promise<Store>;
  deleteStore(storeId: string): Promise<void>;
  
  // Products
  addStoreProduct(product: Partial<StoreProduct>): Promise<StoreProduct>;
  removeStoreProduct(productId: string): Promise<void>;
  
  // Search
  searchStores(query?: string, merchantType?: string): Promise<Store[]>;
}

// Detect host based on platform (localhost for iOS/web, 10.0.2.2 for Android emulator)
const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configuredUrl) {
    return configuredUrl.endsWith("/api") ? configuredUrl : `${configuredUrl}/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5001/api";
  }
  return "http://localhost:5001/api";
};

export class SupabaseStoreRepository implements IStoreRepository {
  private get baseUrl() {
    return getApiBaseUrl();
  }

  async getStoreByOwnerId(ownerId: string): Promise<Store | null> {
    try {
      const res = await fetch(`${this.baseUrl}/public/stores`);
      if (!res.ok) throw new Error("Failed to fetch stores");
      const stores: Store[] = await res.json();
      return stores.find(s => s.owner_id === ownerId) || null;
    } catch (err) {
      console.warn("Express getStoreByOwnerId error:", err);
      return null;
    }
  }

  async getStoreById(storeId: string): Promise<Store | null> {
    try {
      const res = await fetch(`${this.baseUrl}/public/stores`);
      if (!res.ok) throw new Error("Failed to fetch stores");
      const stores: Store[] = await res.json();
      return stores.find(s => s.id === storeId) || null;
    } catch (err) {
      console.warn("Express getStoreById error:", err);
      return null;
    }
  }

  async getStoresByOwnerId(ownerId: string): Promise<Store[]> {
    try {
      const res = await fetch(`${this.baseUrl}/public/stores`);
      if (!res.ok) throw new Error("Failed to fetch stores");
      const stores: Store[] = await res.json();
      return stores.filter(s => s.owner_id === ownerId);
    } catch (err) {
      console.warn("Express getStoresByOwnerId error:", err);
      return [];
    }
  }

  async createStore(storeData: Partial<Store>): Promise<Store> {
    // Falls back to local AsyncStorage in service if this fails
    throw new Error("Store creation must be performed via the Merchant Dashboard.");
  }

  async updateStore(storeId: string, storeData: Partial<Store>): Promise<Store> {
    // Falls back to local AsyncStorage in service if this fails
    throw new Error("Store update must be performed via the Merchant Dashboard.");
  }

  async deleteStore(storeId: string): Promise<void> {
    throw new Error("Store deletion must be performed via the Merchant Dashboard.");
  }

  async addStoreProduct(product: Partial<StoreProduct>): Promise<StoreProduct> {
    throw new Error("Product creation must be performed via the Merchant Dashboard.");
  }

  async removeStoreProduct(productId: string): Promise<void> {
    throw new Error("Product deletion must be performed via the Merchant Dashboard.");
  }

  async searchStores(query?: string, merchantType?: string): Promise<Store[]> {
    try {
      let url = `${this.baseUrl}/public/stores`;
      if (merchantType) {
        url += `?merchantType=${merchantType}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to search stores");
      let stores: Store[] = await res.json();

      if (query) {
        const lowerQ = query.toLowerCase();
        stores = stores.filter(s => s.name.toLowerCase().includes(lowerQ));
      }

      return stores;
    } catch (err) {
      console.warn("Express searchStores error:", err);
      return [];
    }
  }
}
