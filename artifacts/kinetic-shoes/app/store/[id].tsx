import { Ionicons, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState, useEffect } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { StoreService } from "@/services/store/store.service";
import { Store, StoreProduct } from "@/types/store";

const { width } = Dimensions.get("window");
const CARD_W = (width - 48) / 2;

const SHOP_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "Super Store": { bg: "#4A80F0", text: "#FFFFFF" },
  "basic_shop": { bg: "#11998E", text: "#FFFFFF" },
  "vendor":      { bg: "#F7971E", text: "#FFFFFF" },
  "professional": { bg: "#7C3AED", text: "#FFFFFF" },
};

function StoreProductCard({ product, store }: { product: StoreProduct, store: Store }) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const badge = SHOP_TYPE_COLORS[store.merchant_type] || SHOP_TYPE_COLORS["basic_shop"];

  return (
    <Animated.View style={[cardStyle, { width: CARD_W }]}>
      <Pressable
        onPressIn={() => { scale.value = withTiming(0.96, { duration: 100 }); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/product/[id]", params: { id: product.id } });
        }}
        style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.productImageWrapper}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted }}>
              <Text style={{ fontSize: 40 }}>{store.emoji || "🛍️"}</Text>
            </View>
          )}
          {/* Badge top right */}
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {store.merchant_type === "basic_shop" ? "Basic Store" : store.merchant_type === "vendor" ? "Vendor" : "Service"}
            </Text>
          </View>
        </View>

        <View style={styles.productInfo}>
          <Text style={[styles.productBrand, { color: colors.mutedForeground }]} numberOfLines={1}>
            {product.brand || store.name}
          </Text>
          <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#FFB300" />
            <Text style={[styles.ratingText, { color: colors.foreground }]}>{product.rating || "5.0"}</Text>
            <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>
              (12)
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.foreground }]}>
              ${Number(product.price).toFixed(2)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function StoreProfilePage() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allStores = await StoreService.searchStores();
        const found = allStores.find(s => s.id === id);
        if (found) setStore(found);
      } catch(e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const categories = useMemo(() => {
    if (!store?.products) return [];
    const cats = [...new Set(store.products.map((p) => p.category || "General").filter(Boolean))];
    return cats;
  }, [store]);

  const filtered = useMemo(() => {
    if (!store?.products) return [];
    let list = store.products;
    if (activeCategory) list = list.filter((p) => (p.category || "General") === activeCategory);
    if (searchText) list = list.filter((p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (p.brand || "").toLowerCase().includes(searchText.toLowerCase())
    );
    return list;
  }, [store, activeCategory, searchText]);

  const pairs: StoreProduct[][] = [];
  for (let i = 0; i < filtered.length; i += 2) pairs.push(filtered.slice(i, i + 2));

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Store not found</Text>
        </View>
      </View>
    );
  }

  const gradientColors: [string, string] = [
    store.cover_gradient_start || store.accent_color || "#4A00E0", 
    store.cover_gradient_end || store.accent_color || "#8E2DE2"
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Hero Cover ── */}
        <View style={styles.cover}>
          {store.cover_image_url ? (
            <>
              <Image
                source={{ uri: store.cover_image_url }}
                style={styles.coverImage}
                resizeMode="cover"
                fadeDuration={300}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.72)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          <Pressable
            style={[styles.backCircle, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.heroContent}>
            <View style={styles.emojiCircle}>
              <Text style={styles.storeEmoji}>{store.emoji || "🏪"}</Text>
            </View>
            <View style={styles.heroText}>
              <View style={styles.storeTitleRow}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Ionicons name="checkmark-circle" size={20} color={store.accent_color || "#4A80F0"} />
              </View>
              <Text style={styles.storeTagline}>{store.tagline || "Your local marketplace partner"}</Text>
              <View style={styles.heroBadgeRow}>
                <View style={[styles.heroBadge, { backgroundColor: "#22C55E22" }]}>
                  <View style={[styles.statusDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={[styles.heroBadgeText, { color: "#22C55E" }]}>
                    Open Now
                  </Text>
                </View>
                <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                  <Ionicons name="cube-outline" size={12} color="#FFFFFF" />
                  <Text style={[styles.heroBadgeText, { color: "#FFFFFF" }]}>
                    {store.merchant_type === "vendor" ? "Vendor" : "Basic Shop"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Stats Bar ── */}
        <View
          style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>5.0</Text>
            <View style={styles.starRow}>
              {[...Array(5)].map((_, i) => (
                <Ionicons key={i} name="star" size={10} color="#FFB300" />
              ))}
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>12 reviews</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{store.products?.length || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Products</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>1.2k</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
          </View>
        </View>

        {/* ── Search + Filter ── */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: colors.muted }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder={`Search in ${store.name}…`}
              placeholderTextColor={colors.mutedForeground}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Category Pills ── */}
        {categories.length > 0 && (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              <Pressable
                onPress={() => setActiveCategory(null)}
                style={[
                  styles.categoryPill,
                  !activeCategory
                    ? { backgroundColor: store.accent_color || colors.primary, borderColor: store.accent_color || colors.primary }
                    : { backgroundColor: "transparent", borderColor: colors.border },
                ]}
              >
                <Text style={[styles.categoryPillText, { color: !activeCategory ? "#FFFFFF" : colors.mutedForeground }]}>
                  All
                </Text>
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  style={[
                    styles.categoryPill,
                    activeCategory === cat
                      ? { backgroundColor: store.accent_color || colors.primary, borderColor: store.accent_color || colors.primary }
                      : { backgroundColor: "transparent", borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.categoryPillText, { color: activeCategory === cat ? "#FFFFFF" : colors.mutedForeground }]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Products Grid ── */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {activeCategory ?? "All Products"}
              {filtered.length > 0 && (
                <Text style={[styles.productCount, { color: colors.mutedForeground }]}>  {filtered.length} items</Text>
              )}
            </Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Try a different search or category
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {pairs.map((pair, i) => (
                <View key={i} style={styles.gridRow}>
                  {pair.map((product) => (
                    <StoreProductCard key={product.id} product={product} store={store} />
                  ))}
                  {pair.length === 1 && <View style={{ width: CARD_W }} />}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    padding: 16,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },

  cover: {
    height: 220,
    position: "relative",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  coverImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "200%",
    alignSelf: "center",
  },
  backCircle: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 20,
    paddingTop: 0,
    gap: 16,
  },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  storeEmoji: { fontSize: 36 },
  heroText: { flex: 1 },
  storeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  storeName: {
    fontSize: 22,
    fontFamily: "Inter_800ExtraBold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  storeTagline: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 10,
  },
  heroBadgeRow: { flexDirection: "row", gap: 8 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  heroBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 17, fontFamily: "Inter_800ExtraBold" },
  starRow: { flexDirection: "row", gap: 2 },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statDivider: { width: 1, height: 36 },

  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },

  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  categoryPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  productsSection: { paddingHorizontal: 16, paddingTop: 4 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  productCount: { fontSize: 14, fontFamily: "Inter_400Regular" },
  grid: { gap: 16 },
  gridRow: { flexDirection: "row", gap: 16 },

  productCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  productImageWrapper: {
    height: 130,
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  productImage: { width: "100%", height: "100%", resizeMode: "cover" },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  productInfo: { padding: 12 },
  productBrand: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  productName: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 6, lineHeight: 18 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  ratingText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  reviewCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  price: { fontSize: 15, fontFamily: "Inter_800ExtraBold" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
