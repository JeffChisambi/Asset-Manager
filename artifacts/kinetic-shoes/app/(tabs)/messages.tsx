import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInRight,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

import { useColors } from "@/hooks/useColors";
import { StoreService } from "@/services/store/store.service";
import { useCart } from "@/context/CartContext";

// --- Mock Data ---

type ShopCategory = "super" | "basic" | "vendor";

interface Shop {
  id: string;
  name: string;
  category: ShopCategory;
  image: string;
  rating: number;
  itemCount: number;
  description: string;
  isRealStore?: boolean; // true = DB store, navigates to /store/[id]
}

const SHOPS: Shop[] = [
  {
    id: "s1",
    name: "Sneakerverse Mall",
    category: "super",
    image: "https://images.unsplash.com/photo-1555529771-835f59bfc50c?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    itemCount: 12500,
    description: "The ultimate destination for all your sneaker needs. Massive inventory.",
  },
  {
    id: "s2",
    name: "Kicks Plaza",
    category: "super",
    image: "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    itemCount: 8400,
    description: "Premium athletic wear and exclusive limited drops.",
  },
  {
    id: "b1",
    name: "Sole Boutique",
    category: "basic",
    image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=600",
    rating: 4.7,
    itemCount: 320,
    description: "Curated collection of everyday beaters and classics.",
  },
  {
    id: "b2",
    name: "Runners High",
    category: "basic",
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=600",
    rating: 4.6,
    itemCount: 450,
    description: "Specializing in running and performance footwear.",
  },
  {
    id: "v1",
    name: "JD's Vault",
    category: "vendor",
    image: "https://images.unsplash.com/photo-1618365908648-e71bd5716cba?auto=format&fit=crop&q=80&w=400",
    rating: 5.0,
    itemCount: 12,
    description: "Selling some grails from my personal collection.",
  },
  {
    id: "v2",
    name: "KickFlip Alex",
    category: "vendor",
    image: "https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&q=80&w=400",
    rating: 4.5,
    itemCount: 5,
    description: "Local products and merchant updates.",
  },
  {
    id: "b3",
    name: "Retro Revival",
    category: "basic",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
    itemCount: 180,
    description: "Vintage finds and restored classics.",
  },
];

const CATEGORY_TABS = [
  { key: "all", label: "Explore" },
  { key: "super", label: "Super Stores" },
  { key: "basic", label: "Basic Stores" },
  { key: "vendor", label: "Vendors" },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// --- Components ---

function ShopCard({ shop, index }: { shop: Shop; index: number }) {
  const colors = useColors();
  const isSuper = shop.category === "super";

  const handlePress = () => {
    if (shop.isRealStore) {
      router.push({ pathname: "/store/[id]", params: { id: shop.id } });
    } else if (shop.category === "super") {
      router.push({ pathname: "/superstore/[id]", params: { id: shop.id } });
    } else {
      router.push({ pathname: "/store/[id]", params: { id: shop.id } });
    }
  };

  const getCategoryIcon = () => {
    switch (shop.category) {
      case "super": return <MaterialCommunityIcons name="domain" size={12} color={colors.primary} />;
      case "basic": return <MaterialCommunityIcons name="storefront-outline" size={12} color={colors.foreground} />;
      case "vendor": return <MaterialCommunityIcons name="account-tie" size={12} color={colors.foreground} />;
    }
  };

  const getCategoryLabel = () => {
    switch (shop.category) {
      case "super": return "Super Store";
      case "basic": return "Basic Store";
      case "vendor": return "Vendor";
    }
  };

  if (isSuper) {
    return (
      <AnimatedPressable
        entering={FadeInDown.delay(index * 100).springify()}
        onPress={handlePress}
        style={[styles.superCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Image source={{ uri: shop.image }} style={styles.superImage} />
        <View style={styles.superOverlay}>
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.superContent}>
            <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <MaterialCommunityIcons name="star" size={12} color="#FFD700" />
              <Text style={styles.badgeText}>{shop.rating}</Text>
            </View>
            <View>
              <Text style={styles.superTitle}>{shop.name}</Text>
              <View style={styles.superMeta}>
                <View style={[styles.catPill, { backgroundColor: colors.primary }]}>
                  {getCategoryIcon()}
                  <Text style={[styles.catText, { color: "#FFF" }]}>{getCategoryLabel()}</Text>
                </View>
                <Text style={styles.superItems}>{shop.itemCount.toLocaleString()} items</Text>
              </View>
            </View>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 100).springify()}
      onPress={handlePress}
      style={[styles.standardCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Image source={{ uri: shop.image }} style={styles.standardImage} />
      <View style={styles.standardInfo}>
        <View style={styles.standardHeader}>
          <Text style={[styles.standardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {shop.name}
          </Text>
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
            <Text style={[styles.ratingText, { color: colors.foreground }]}>{shop.rating}</Text>
          </View>
        </View>
        <Text style={[styles.standardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {shop.description}
        </Text>
        <View style={styles.standardFooter}>
          <View style={[styles.catPill, { backgroundColor: colors.muted }]}>
            {getCategoryIcon()}
            <Text style={[styles.catText, { color: colors.foreground }]}>{getCategoryLabel()}</Text>
          </View>
          <Text style={[styles.standardItems, { color: colors.mutedForeground }]}>
            {shop.itemCount} items
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

// Simple LinearGradient polyfill using simple views since expo-linear-gradient might not be installed
function LinearGradient({ colors, style }: { colors: string[], style: any }) {
  return (
    <View style={[style, { backgroundColor: colors[1], opacity: 0.8 }]} />
  );
}

export default function MarketplaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [realShops, setRealShops] = useState<Shop[]>([]);
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  useFocusEffect(
    useCallback(() => {
      async function loadRealStores() {
        try {
          const stores = await StoreService.searchStores();
          const mapped = stores.map(s => ({
            id: s.id,
            name: s.name,
            category: (s.merchant_type === "basic_shop" ? "basic" : s.merchant_type === "vendor" ? "vendor" : "super") as ShopCategory,
            image: s.cover_image_url || `https://images.unsplash.com/photo-1555529771-835f59bfc50c?auto=format&fit=crop&q=80&w=800`,
            rating: 5.0,
            itemCount: s.products?.length || 0,
            description: s.tagline || "A new shop on the platform",
            isRealStore: true,
          }));
          setRealShops(mapped);
        } catch (err) {
          console.error("Failed to load real stores", err);
        }
      }
      loadRealStores();
    }, [])
  );

  const filteredShops = useMemo(() => {
    const allShops = [...realShops, ...SHOPS];
    return allShops.filter(
      (shop) =>
        (activeTab === "all" || shop.category === activeTab) &&
        shop.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTab, searchQuery, realShops]);

  const superStores = filteredShops.filter((s) => s.category === "super");
  const standardStores = filteredShops.filter((s) => s.category !== "super");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Area */}
      <BlurView
        intensity={80}
        tint={colors.background === "#FFFFFF" ? "light" : "dark"}
        style={[styles.headerBlur, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.foreground }]}>Marketplace</Text>
          <Pressable 
            style={[styles.cartBtn, { backgroundColor: colors.muted }]}
            onPress={() => router.push("/(tabs)/add")}
          >
            <Feather name="shopping-bag" size={20} color={colors.foreground} />
            {cartCount > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search shops & vendors..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {CATEGORY_TABS.map((tab, i) => {
            const isActive = activeTab === tab.key;
            return (
              <AnimatedPressable
                key={tab.key}
                entering={FadeInRight.delay(i * 50).springify()}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabBtn,
                  {
                    backgroundColor: isActive ? colors.primary : colors.muted,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? "#FFFFFF" : colors.mutedForeground },
                  ]}
                >
                  {tab.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </BlurView>

      {/* Content */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        layout={LinearTransition.springify()}
      >
        {superStores.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Featured Malls</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.superScroll}
              snapToInterval={320}
              decelerationRate="fast"
            >
              {superStores.map((shop, i) => (
                <View key={shop.id} style={{ width: 300, marginRight: 16 }}>
                  <ShopCard shop={shop} index={i} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {standardStores.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {activeTab === "vendor" ? "Independent Vendors" : "Discover Shops"}
            </Text>
            <View style={styles.standardGrid}>
              {standardStores.map((shop, i) => (
                <ShopCard key={shop.id} shop={shop} index={i} />
              ))}
            </View>
          </View>
        )}

        {filteredShops.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No shops found</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Try adjusting your search or switching categories.
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBlur: {
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  cartBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  tabsScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tabBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    paddingTop: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  superScroll: {
    paddingHorizontal: 20,
  },
  superCard: {
    height: 380,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  superImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },
  superOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 20,
  },
  superContent: {
    gap: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backdropFilter: "blur(10px)",
  },
  badgeText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  superTitle: {
    color: "#FFF",
    fontSize: 26,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 8,
  },
  superMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  catText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  superItems: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  standardGrid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  standardCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    height: 120,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  standardImage: {
    width: 110,
    height: "100%",
    resizeMode: "cover",
  },
  standardInfo: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  standardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  standardTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flex: 1,
    marginRight: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  standardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 8,
  },
  standardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  standardItems: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  emptyDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});
