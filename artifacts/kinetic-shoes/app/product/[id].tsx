import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";

const { width } = Dimensions.get("window");
const IMAGE_H = 300;
const fallbackProductImage = require("@/assets/logo and icon/doorsteplogo.png");

const SHOP_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "Super Store": { bg: "#13B734", text: "#FFFFFF" },
  "Basic Store": { bg: "#11998E", text: "#FFFFFF" },
  "Vendor":      { bg: "#F7971E", text: "#FFFFFF" },
};

const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configuredUrl) return configuredUrl.endsWith("/api") ? configuredUrl : `${configuredUrl}/api`;
  return Platform.OS === "android" ? "http://10.0.2.2:5001/api" : "http://localhost:5001/api";
};

export default function ProductDetailPage() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [cartAdded, setCartAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const cartScale = useSharedValue(1);

  // DB States for dynamic products
  const [dbProduct, setDbProduct] = useState<any>(null);
  const [dbStore, setDbStore] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(true);

  useEffect(() => {
    const fetchDbProduct = async () => {
      if (!id) return;
      setLoadingDb(true);
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/public/products/${id}`);
        
        if (res.ok) {
          const data = await res.json();
          setDbProduct(data.product);
          setDbStore(data.store);
        } else {
          // Fallback to local service (useful for newly created 'temp-' products that haven't synced)
          const { StoreService } = await import("@/services/store/store.service");
          const allStores = await StoreService.searchStores();
          let foundProd = null;
          let foundStore = null;
          for (const s of allStores) {
            if (s.products) {
              const p = s.products.find(prod => prod.id === id);
              if (p) {
                foundProd = p;
                foundStore = s;
                break;
              }
            }
          }
          if (foundProd) {
            setDbProduct(foundProd);
            setDbStore(foundStore);
          }
        }
      } catch (err) {
        console.warn("Failed to load product from DB:", err);
      } finally {
        setLoadingDb(false);
      }
    };

    fetchDbProduct();
  }, [id]);

  const product = dbProduct ? {
    id: dbProduct.id,
    shopId: dbProduct.store_id,
    shopName: dbStore?.name || "Store",
    shopType: (dbStore?.merchant_type === "basic_shop" ? "Basic Store" : dbStore?.merchant_type === "vendor" ? "Vendor" : "Super Store") as any,
    name: dbProduct.name,
    price: Number(dbProduct.price),
    originalPrice: dbProduct.discountPrice ? Number(dbProduct.discountPrice) : undefined,
    image: dbProduct.image_url ? { uri: dbProduct.image_url } : undefined,
    brand: dbProduct.brand || dbStore?.name || "Doorstep",
    rating: dbProduct.rating || 5.0,
    reviews: 8,
    availableItems: dbProduct.availableItems || 0,
    category: dbProduct.category || "General",
    tags: [dbProduct.category || "General"],
    description: dbProduct.description || `A quality product from ${dbStore?.name || "this Doorstep merchant"}.`,
  } : null;

  const store = dbStore;
  const badge = product ? (SHOP_TYPE_COLORS[product.shopType] ?? SHOP_TYPE_COLORS["Basic Store"]) : null;

  const SIZES = [38, 39, 40, 41, 42, 43, 44, 45];
  const isShoes = product?.tags?.includes("Shoes") || product?.category === "Shoes";
  const requiresSize = isShoes;

  const cartBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartScale.value }],
  }));

  const handleAddToCart = () => {
    if ((requiresSize && !selectedSize) || !product) return;
    
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      brand: product.brand,
      rating: product.rating,
      category: product.tags[0] || "General",
      imageUrl: product.image ? (product.image as any).uri : undefined,
      imageSource: undefined,
      shopId: product.shopId,
      shopName: product.shopName,
      shopType: product.shopType,
      selectedSize: selectedSize || 0,
    }, quantity);

    cartScale.value = withSequence(withSpring(0.92, { damping: 8 }), withSpring(1));
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2000);
  };

  if (loadingDb) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Product not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Hero Image ── */}
        <View style={styles.imageContainer}>
          <Image source={product.image || fallbackProductImage} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back + fav buttons */}
          <View style={[styles.imageTopRow, { top: insets.top + 12 }]}>
            <Pressable style={styles.imageCircleBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.imageCircleBtn}>
              <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Tags overlay */}
          <View style={styles.imageTags}>
            {product.tags.map((tag) => (
              <View key={tag} style={[styles.imageTag, tag === "Sale" && { backgroundColor: "#EF4444" }, tag === "Limited" && { backgroundColor: "#7C3AED" }]}>
                <Text style={styles.imageTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Content ── */}
        <View style={{ paddingHorizontal: 20 }}>

          {/* Shop badge + name */}
          <View style={styles.shopRow}>
            {badge && (
              <View style={[styles.shopBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.shopBadgeText, { color: badge.text }]}>{product.shopType}</Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                if (store) router.push({ pathname: "/store/[id]", params: { id: product.shopId } });
              }}
            >
              <Text style={[styles.shopName, { color: colors.primary }]}>
                {product.shopName} →
              </Text>
            </Pressable>
          </View>

          {/* Title */}
          <Text style={[styles.productBrand, { color: colors.mutedForeground }]}>{product.brand}</Text>
          <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[...Array(5)].map((_, i) => (
              <Ionicons key={i} name="star" size={14} color={i < Math.floor(product.rating) ? "#FFB300" : colors.muted} />
            ))}
            <Text style={[styles.ratingValue, { color: colors.foreground }]}>{product.rating}</Text>
            <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>({product.reviews} reviews)</Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.foreground }]}>${product.price.toFixed(2)}</Text>
            {product.originalPrice && (
              <Text style={styles.originalPrice}>${product.originalPrice.toFixed(2)}</Text>
            )}
            {product.originalPrice && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={[styles.descCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.descLabel, { color: colors.foreground }]}>About this product</Text>
            <Text style={[styles.descText, { color: colors.mutedForeground }]}>{product.description}</Text>
          </View>

          {/* Availability */}
          <View style={styles.availRow}>
            <View style={styles.availDot} />
            <Text style={[styles.availText, { color: "#22C55E" }]}>
              {product.availableItems} items in stock
            </Text>
          </View>

          {/* Size selector */}
          {requiresSize && (
            <>
              <Text style={[styles.sizeLabel, { color: colors.foreground }]}>Select Size (EU)</Text>
              <View style={styles.sizeGrid}>
                {SIZES.map((size) => (
                  <Pressable
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    style={[
                      styles.sizeBtn,
                      {
                        backgroundColor: selectedSize === size ? colors.foreground : colors.card,
                        borderColor: selectedSize === size ? colors.foreground : colors.border,
                      },
                    ]}
                  >
                    <Text style={[
                      styles.sizeBtnText,
                      { color: selectedSize === size ? colors.background : colors.foreground },
                    ]}>
                      {size}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Quantity */}
          <View style={styles.qtyRow}>
            <Text style={[styles.qtyLabel, { color: colors.foreground }]}>Quantity</Text>
            <View style={[styles.qtyControl, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Ionicons name="remove" size={20} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.qtyValue, { color: colors.foreground }]}>{quantity}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => Math.min(product.availableItems, q + 1))}
              >
                <Ionicons name="add" size={20} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Store info card */}
          {store && (
            <Pressable
              style={[styles.storeInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: "/store/[id]", params: { id: product.shopId } })}
            >
              <View style={[styles.storeEmoji, { backgroundColor: (store.accentColor || store.accent_color || colors.primary) + "22" }]}>
                <Text style={{ fontSize: 24 }}>{store.emoji || "🛍️"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.storeInfoName, { color: colors.foreground }]}>{store.name}</Text>
                <View style={styles.storeInfoMeta}>
                  <Ionicons name="star" size={12} color="#FFB300" />
                  <Text style={[styles.storeInfoText, { color: colors.mutedForeground }]}>
                    {store.rating} · {store.deliveryTime}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky Bottom CTA ── */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
          { paddingBottom: insets.bottom + 12 },
        ]}
      >
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.foreground }]}>
            ${(product.price * quantity).toFixed(2)}
          </Text>
        </View>
        <Animated.View style={cartBtnStyle}>
          <Pressable
            style={[
              styles.addToCartBtn,
              {
                backgroundColor: (requiresSize && !selectedSize) ? colors.muted : (cartAdded ? "#22C55E" : colors.foreground),
                opacity: (requiresSize && !selectedSize) ? 0.6 : 1,
              },
            ]}
            onPress={handleAddToCart}
          >
            <Ionicons
              name={cartAdded ? "checkmark" : "bag-add-outline"}
              size={20}
              color={cartAdded ? "#FFFFFF" : colors.background}
            />
            <Text style={[styles.addToCartText, { color: cartAdded ? "#FFFFFF" : colors.background }]}>
              {(requiresSize && !selectedSize) ? "Pick a Size" : cartAdded ? "Added!" : "Add to Cart"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: 16 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16, fontFamily: "Inter_500Medium" },

  // Hero
  imageContainer: { width, height: IMAGE_H, position: "relative" },
  heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
  imageTopRow: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  imageCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageTags: {
    position: "absolute",
    bottom: 14,
    left: 16,
    flexDirection: "row",
    gap: 8,
  },
  imageTag: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  imageTagText: { color: "#FFF", fontSize: 11, fontFamily: "Inter_700Bold" },

  // Content
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    marginBottom: 8,
  },
  shopBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shopBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  shopName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  productBrand: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 6, letterSpacing: 0.5 },
  productName: { fontSize: 26, fontFamily: "Inter_800ExtraBold", marginBottom: 12, lineHeight: 32 },

  // Rating
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
  },
  ratingValue: { fontSize: 14, fontFamily: "Inter_700Bold", marginLeft: 4 },
  reviewCount: { fontSize: 13, fontFamily: "Inter_500Medium" },

  // Price
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  price: { fontSize: 28, fontFamily: "Inter_800ExtraBold" },
  originalPrice: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: "#EF444422",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: { color: "#EF4444", fontSize: 12, fontFamily: "Inter_700Bold" },

  // Description
  descCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  descLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  descText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23 },

  // Availability
  availRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  availDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  availText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Sizes
  sizeLabel: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },
  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  sizeBtn: {
    width: 54,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Quantity
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  qtyLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  qtyBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  qtyValue: { fontSize: 16, fontFamily: "Inter_700Bold", paddingHorizontal: 16 },

  // Store info
  storeInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  storeEmoji: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  storeInfoName: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  storeInfoMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  storeInfoText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  totalRow: { flex: 1 },
  totalLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  totalValue: { fontSize: 22, fontFamily: "Inter_800ExtraBold" },
  addToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 18,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  addToCartText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
