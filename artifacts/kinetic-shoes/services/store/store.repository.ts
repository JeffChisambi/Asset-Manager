import { supabase } from "@/lib/supabase";
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

export class SupabaseStoreRepository implements IStoreRepository {
  async getStoreByOwnerId(ownerId: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from("stores")
      .select("*, products:store_products(*)")
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async getStoreById(storeId: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from("stores")
      .select("*, products:store_products(*)")
      .eq("id", storeId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async getStoresByOwnerId(ownerId: string): Promise<Store[]> {
    const { data, error } = await supabase
      .from("stores")
      .select("*, products:store_products(*)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  async createStore(storeData: Partial<Store>): Promise<Store> {
    const { products, ...dbStoreData } = storeData;
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .insert(dbStoreData)
      .select("*")
      .single();

    if (storeError) throw new Error(storeError.message);

    if (products && products.length > 0) {
      const formattedProducts = products.map((p) => ({
        store_id: store.id,
        name: p.name,
        price: p.price,
        brand: p.brand || "",
        rating: p.rating || 5.0,
        category: p.category || "Shoes",
        image_url: p.image_url || null
      }));

      const { error: productsError } = await supabase
        .from("store_products")
        .insert(formattedProducts);
        
      if (productsError) {
        console.warn("Failed to insert products:", productsError.message);
      }
    }

    // Refetch the full store to include the joined products
    return await this.getStoreById(store.id) as Store;
  }

  async updateStore(storeId: string, storeData: Partial<Store>): Promise<Store> {
    const { products, ...dbStoreData } = storeData;
    const { data: store, error } = await supabase
      .from("stores")
      .update({ ...dbStoreData, updated_at: new Date().toISOString() })
      .eq("id", storeId)
      .select("*, products:store_products(*)")
      .single();

    if (error) throw new Error(error.message);

    // Reconcile/sync products in Supabase
    if (products) {
      try {
        // 1. Fetch current database products for this store
        const { data: currentProducts } = await supabase
          .from("store_products")
          .select("id")
          .eq("store_id", storeId);

        const currentIds = currentProducts ? currentProducts.map(p => p.id) : [];

        // 2. Identify products to delete (in DB but not in the input products list)
        const inputIds = products.map(p => p.id).filter(id => id && !String(id).startsWith("temp-"));
        const toDelete = currentIds.filter(id => !inputIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from("store_products").delete().in("id", toDelete);
        }

        // 3. Identify products to insert or update
        for (const p of products) {
          const isNew = !p.id || String(p.id).startsWith("temp-");
          const productData = {
            store_id: storeId,
            name: p.name,
            price: p.price,
            brand: p.brand || "",
            rating: p.rating || 5.0,
            category: p.category || "Shoes",
            image_url: p.image_url || null
          };

          if (isNew) {
            await supabase.from("store_products").insert(productData);
          } else {
            await supabase.from("store_products").update(productData).eq("id", p.id);
          }
        }
      } catch (prodErr) {
        console.warn("Failed to reconcile products in database:", prodErr);
      }
    }

    // Refetch the full store to include the updated products
    const finalStore = await this.getStoreById(storeId);
    return finalStore || store;
  }

  async deleteStore(storeId: string): Promise<void> {
    const { error } = await supabase.from("stores").delete().eq("id", storeId);
    if (error) throw new Error(error.message);
  }

  async addStoreProduct(product: Partial<StoreProduct>): Promise<StoreProduct> {
    const { data, error } = await supabase
      .from("store_products")
      .insert(product)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async removeStoreProduct(productId: string): Promise<void> {
    const { error } = await supabase.from("store_products").delete().eq("id", productId);
    if (error) throw new Error(error.message);
  }

  async searchStores(query?: string, merchantType?: string): Promise<Store[]> {
    let q = supabase.from("stores").select("*, products:store_products(*)");
    
    if (merchantType) {
      q = q.eq("merchant_type", merchantType);
    }
    
    if (query) {
      q = q.ilike("name", `%${query}%`);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
  }
}
