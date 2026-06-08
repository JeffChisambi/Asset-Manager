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
  globalSearch(query: string): Promise<{ stores: Store[], products: StoreProduct[] }>;
  linkStoreToProfile(storeId: string, chatProfileId: string, merchantId: string): Promise<Store | null>;
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
      // First try fetching stores linked to this chat profile ID from the API
      const res = await fetch(`${this.baseUrl}/public/stores/by-profile/${encodeURIComponent(ownerId)}`);
      if (res.ok) {
        const stores: Store[] = await res.json();
        if (stores.length > 0) return stores;
      }
    } catch (err) {
      console.warn("Express getStoresByOwnerId (by-profile) error:", err);
    }
    // Fallback: fetch all stores and filter by owner_id (covers legacy numeric merchantId case)
    try {
      const res = await fetch(`${this.baseUrl}/public/stores`);
      if (!res.ok) throw new Error("Failed to fetch stores");
      const stores: Store[] = await res.json();
      return stores.filter(s => s.owner_id === ownerId);
    } catch (err) {
      console.warn("Express getStoresByOwnerId fallback error:", err);
      return [];
    }
  }

  async createStore(storeData: Partial<Store>): Promise<Store> {
    const chatProfileId = storeData.owner_id;
    if (!chatProfileId) throw new Error("owner_id (chatProfileId) is required to create a store");

    const res = await fetch(`${this.baseUrl}/public/stores/create-from-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatProfileId,
        name: storeData.name,
        tagline: storeData.tagline,
        emoji: storeData.emoji,
        accent_color: storeData.accent_color,
        cover_gradient_start: storeData.cover_gradient_start,
        cover_gradient_end: storeData.cover_gradient_end,
        cover_image_url: storeData.cover_image_url,
        merchant_type: storeData.merchant_type,
        products: storeData.products || [],
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Failed to create store" }));
      throw new Error(body.error || `Server error ${res.status}`);
    }

    return await res.json() as Store;
  }

  async updateStore(storeId: string, storeData: Partial<Store>): Promise<Store> {
    const chatProfileId = storeData.owner_id;

    if (chatProfileId) {
      const res = await fetch(
        `${this.baseUrl}/public/stores/update-from-profile/${encodeURIComponent(chatProfileId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: storeData.name,
            tagline: storeData.tagline,
            cover_image_url: storeData.cover_image_url,
            merchant_type: storeData.merchant_type,
            products: storeData.products || [],
            is_active: storeData.is_active,
          }),
        }
      );

      if (res.ok) return await res.json() as Store;

      // 404 means the store was previously local-only — create it in the DB now
      if (res.status !== 404) {
        const body = await res.json().catch(() => ({ error: "Failed to update store" }));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      // Migrate local-only store to the database
      return await this.createStore(storeData);
    }

    throw new Error("owner_id (chatProfileId) is required to update a store");
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

  async globalSearch(query: string): Promise<{ stores: Store[], products: StoreProduct[] }> {
    if (!query) return { stores: [], products: [] };
    try {
      const url = `${this.baseUrl}/public/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to perform global search");
      return await res.json();
    } catch (err) {
      console.warn("Express globalSearch error:", err);
      return { stores: [], products: [] };
    }
  }

  async linkStoreToProfile(storeId: string, chatProfileId: string, merchantId: string): Promise<Store | null> {
    try {
      const res = await fetch(`${this.baseUrl}/public/stores/link-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, chatProfileId, merchantId }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn("Express linkStoreToProfile error:", err);
      return null;
    }
  }
}
