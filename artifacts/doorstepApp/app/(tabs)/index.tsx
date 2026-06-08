import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductCard } from "@/components/ProductCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useChat } from "@/context/ChatContext";
import { StoreService } from "@/services/store/store.service";
import { Store } from "@/types/store";
import { LinearGradient } from "expo-linear-gradient";

const doorstepLogo           = require("@/assets/logo and icon/doorsteplogo.png");

// ─── Data ─────────────────────────────────────────────────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type Category = {
  id: string;
  label: string;
  icon: IoniconName;
  color: string;
};

const CATEGORIES: Category[] = [
  { id: "food",           label: "Food",                   icon: "fast-food-outline",        color: "#FF6B35" },
  { id: "fashion",        label: "Clothing & Fashion",     icon: "shirt-outline",            color: "#C850C0" },
  { id: "housing",        label: "Housing & Home",         icon: "home-outline",             color: "#4776E6" },
  { id: "furniture",      label: "Furniture",              icon: "bed-outline",              color: "#8B6914" },
  { id: "electronics",    label: "Electronics",            icon: "phone-portrait-outline",   color: "#0F3460" },
  { id: "transportation", label: "Transportation",         icon: "car-outline",              color: "#1A6B4A" },
  { id: "health",         label: "Health",                 icon: "medical-outline",          color: "#E84393" },
  { id: "beauty",         label: "Beauty & Personal Care", icon: "color-palette-outline",    color: "#F953C6" },
  { id: "education",      label: "Education",              icon: "school-outline",           color: "#13B734" },
  { id: "entertainment",  label: "Entertainment",          icon: "game-controller-outline",  color: "#6C3483" },
  { id: "travel",         label: "Travel",                 icon: "airplane-outline",         color: "#00C6FF" },
  { id: "financial",      label: "Financial Services",     icon: "card-outline",             color: "#1A2980" },
  { id: "pets",           label: "Pets",                   icon: "paw-outline",              color: "#F7971E" },
  { id: "baby",           label: "Baby & Parenting",       icon: "happy-outline",            color: "#FC5C7D" },
  { id: "sports",         label: "Sports & Fitness",       icon: "barbell-outline",          color: "#56CCF2" },
  { id: "business",       label: "Business & Industrial",  icon: "business-outline",         color: "#485563" },
  { id: "agriculture",    label: "Agriculture",            icon: "leaf-outline",             color: "#4CAF50" },
  { id: "construction",   label: "Construction",           icon: "construct-outline",        color: "#E65C00" },
  { id: "energy",         label: "Energy & Utilities",     icon: "flash-outline",            color: "#F9D423" },
  { id: "digital",        label: "Digital Products",       icon: "laptop-outline",           color: "#4776E6" },
  { id: "communication",  label: "Communication",          icon: "chatbubbles-outline",      color: "#11998E" },
  { id: "security",       label: "Security",               icon: "shield-checkmark-outline", color: "#373B44" },
  { id: "gifts",          label: "Gifts & Luxury",         icon: "gift-outline",             color: "#C6426E" },
  { id: "services",       label: "Services",               icon: "briefcase-outline",        color: "#667EEA" },
];

type Product = {
  id: string;
  name: string;
  price: number;
  brand: string;
  imageUrl?: string;
  category?: string;
  shopType: string;
  shopName: string;
  shopId?: string;
  availableItems: number;
};

// ─── CategoryChip ──────────────────────────────────────────────────────────────
function CategoryChip({
  item,
  active,
  onPress,
}: {
  item: Category;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
        active && styles.chipActive,
      ]}
    >
      <Ionicons
        name={item.icon}
        size={15}
        color={active ? "#FFFFFF" : item.color}
      />
      <Text
        style={[styles.chipLabel, { color: active ? "#FFFFFF" : colors.foreground }]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}



function AnimatedMenuItem({
  item,
  index,
  totalItems,
  colors,
  onClose,
}: {
  item: { label: string; icon: string; onPress: () => void };
  index: number;
  totalItems: number;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
}) {
  return (
    <View>
      <Pressable
        onPress={item.onPress}
        style={({ pressed }) => [
          styles.popupItem,
          { borderBottomColor: colors.border },
          index === totalItems - 1 && { borderBottomWidth: 0 },
          pressed && { backgroundColor: colors.muted },
        ]}
      >
        <Ionicons name={item.icon as any} size={18} color={colors.foreground} />
        <Text style={[styles.popupItemLabel, { color: colors.foreground }]}>
          {item.label}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── PopupMenu ────────────────────────────────────────────────────────────────
function PopupMenu({
  visible,
  onClose,
  anchorTop,
}: {
  visible: boolean;
  onClose: () => void;
  anchorTop: number;
}) {
  const colors = useColors();
  const { setThemeMode, resolvedScheme } = useTheme();
  const { logout } = useChat();

  // Card entrance: scaleY unfolds from top + opacity
  const cardAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      // Small delay so items animate after card
      Animated.parallel([
        Animated.spring(cardAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 320,
          mass: 0.8,
        }),
      ]).start();
    } else {
      Animated.timing(cardAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible]);

  const menuItems = [
    {
      label: "Settings",
      icon: "settings-outline",
      onPress: () => { onClose(); setTimeout(() => router.push("/settings"), 180); },
    },
    {
      label: resolvedScheme === "dark" ? "Light Mode" : "Dark Mode",
      icon: resolvedScheme === "dark" ? "sunny-outline" : "moon-outline",
      onPress: () => {
        setThemeMode(resolvedScheme === "dark" ? "light" : "dark");
        onClose();
      },
    },
    {
      label: "Notifications",
      icon: "notifications-outline",
      onPress: () => { onClose(); setTimeout(() => router.push("/notifications"), 180); },
    },
    {
      label: "About",
      icon: "information-circle-outline",
      onPress: () => onClose(),
    },
    {
      label: "Sign Out",
      icon: "log-out-outline",
      onPress: async () => {
        // Close the menu first so the UI feels responsive
        onClose();
        // Allow any in-flight AsyncStorage writes (profile edits, etc.) to settle
        await new Promise((r) => setTimeout(r, 80));
        // Full logout: clears chatAuthToken, doorstep_current_user, chatLastRead,
        // chatStories, and resets all in-memory context state
        await logout();
        // Belt-and-suspenders: also wipe the legacy hasLoggedIn flag
        await AsyncStorage.removeItem("hasLoggedIn").catch(() => {});
        // Navigate to login and replace the history stack so back is impossible
        router.replace("/login");
      },
    },
  ];

  if (!mounted) return null;

  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={onClose}>
      {/* Tap-outside backdrop */}
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

      {/* Card — scales open from the top-left corner */}
      <Animated.View
        style={[
          styles.popupCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            top: anchorTop,
            shadowColor: "#000",
            opacity: cardAnim.interpolate({
              inputRange: [0, 0.4, 1],
              outputRange: [0, 0.9, 1],
            }),
            transform: [
              // Anchor scale to top of card by shifting before/after
              { translateY: -60 },
              {
                scaleY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.05, 1],
                }),
              },
              {
                scaleX: cardAnim.interpolate({
                  inputRange: [0, 0.6, 1],
                  outputRange: [0.7, 1.02, 1],
                }),
              },
              { translateY: 60 },
            ],
          },
        ]}
      >
        {visible && menuItems.map((item, i) => (
          <AnimatedMenuItem
            key={item.label}
            item={item}
            index={i}
            totalItems={menuItems.length}
            colors={colors}
            onClose={onClose}
          />
        ))}
      </Animated.View>
    </Modal>
  );
}


// ─── HomeScreen ────────────────────────────────────────────────────────────────
function getStoreMeta(merchantType?: Store["merchant_type"]) {
  const meta: Record<string, { label: string; icon: IoniconName; accent: string }> = {
    super_store: { label: "Super Store", icon: "business-outline", accent: "#FF9F43" },
    basic_shop: { label: "Basic Store", icon: "storefront-outline", accent: "#13B734" },
    vendor: { label: "Vendor", icon: "cube-outline", accent: "#F7971E" },
    professional: { label: "Professional", icon: "briefcase-outline", accent: "#667EEA" },
  };

  return meta[merchantType || "basic_shop"] ?? meta.basic_shop;
}

function SectionHeading({
  title,
  icon,
  actionLabel,
  onAction,
}: {
  title: string;
  icon: IoniconName;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useColors();

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View
          style={[
            styles.sectionIconBadge,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name={icon} size={14} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.sectionAction}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StoreSummaryCard({ store }: { store: Store }) {
  const colors = useColors();
  const meta = getStoreMeta(store.merchant_type);
  const accent = store.accent_color || meta.accent;
  const gradientColors: [string, string] = [
    store.cover_gradient_start || accent,
    store.cover_gradient_end || accent,
  ];
  const rating = typeof store.rating === "number" ? store.rating : 5;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/store/[id]", params: { id: store.id } });
      }}
      style={[
        styles.storeCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.storeCover, { backgroundColor: accent }]}>
        {store.cover_image_url ? (
          <Image
            source={{ uri: store.cover_image_url }}
            style={styles.storeCoverImg}
            resizeMode="cover"
            fadeDuration={300}
          />
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.storeCoverOverlay} />
        <View style={styles.storeBadge}>
          <Ionicons name={meta.icon} size={12} color="#FFFFFF" />
          <Text style={styles.storeBadgeText}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.storeInfo}>
        <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
          {store.name}
        </Text>
        <Text style={[styles.storeTagline, { color: colors.mutedForeground }]} numberOfLines={1}>
          {store.tagline || `${meta.label} on Doorstep`}
        </Text>
        <View style={styles.storeMetaRow}>
          <Ionicons name="star" size={11} color="#FFB300" />
          <Text style={[styles.storeRating, { color: colors.foreground }]}>
            {rating.toFixed(1)}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: colors.secondary }]}>
            <View style={[styles.openDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.statusText}>Open</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function StoreRail({
  title,
  icon,
  stores,
}: {
  title: string;
  icon: IoniconName;
  stores: Store[];
}) {
  if (stores.length === 0) return null;

  return (
    <>
      <SectionHeading title={title} icon={icon} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storeRail}
        style={{ marginBottom: 24 }}
      >
        {stores.map((store) => (
          <StoreSummaryCard key={store.id} store={store} />
        ))}
      </ScrollView>
    </>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [basicShops, setBasicShops] = useState<Store[]>([]);
  const [vendorShops, setVendorShops] = useState<Store[]>([]);
  const [superStores, setSuperStores] = useState<Store[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function fetchShops() {
        try {
          const basics = await StoreService.searchStores(undefined, "basic_shop");
          const vendors = await StoreService.searchStores(undefined, "vendor");
          const supers = await StoreService.searchStores(undefined, "super_store");
          setBasicShops(basics);
          setVendorShops(vendors);
          setSuperStores(supers);
        } catch (err) {
          console.warn("Failed to load DB stores:", err);
        }
      }
      fetchShops();
    }, [])
  );

  const [menuVisible, setMenuVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  // Position the popup just below the header icon
  const menuAnchorTop = topPad + 52;

  const allDbProducts = [...superStores, ...basicShops, ...vendorShops].flatMap((store) =>
    (store.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      brand: p.brand || "",
      imageUrl: p.image_url,
      category: p.category,
      shopType: getStoreMeta(store.merchant_type).label,
      shopName: store.name,
      shopId: store.id,
      availableItems: p.availableItems ?? p.stock ?? 0,
    }))
  );

  const baseProducts = activeCategory
    ? allDbProducts.filter((p) => p.category === activeCategory)
    : allDbProducts;

  const displayed = baseProducts;


  const pairs: Product[][] = [];
  for (let i = 0; i < displayed.length; i += 2) pairs.push(displayed.slice(i, i + 2));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Popup Menu */}
      <PopupMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        anchorTop={menuAnchorTop}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: 100 }]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMenuVisible(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Image
              source={doorstepLogo}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Doorstep
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/search")}
            >
              <Ionicons name="search-outline" size={24} color={colors.foreground} />
            </Pressable>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/notifications")}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
            </Pressable>
          </View>
        </View>


        {/* ── Sale Banner ── */}
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, { color: colors.foreground }]}>Shop local on Doorstep</Text>
            <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>Discover live products from verified merchants near you.</Text>
            <Pressable
              onPress={() => router.push("/search")}
              style={[styles.shopNowBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="search-outline" size={14} color="#FFFFFF" />
              <Text style={styles.shopNowText}>Browse</Text>
            </Pressable>
          </View>
          <View style={[styles.bannerMark, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Image source={doorstepLogo} style={styles.bannerImg} resizeMode="contain" />
          </View>
        </View>

        <StoreRail title="Super Stores" icon="business-outline" stores={superStores} />
        <StoreRail title="Basic Stores" icon="storefront-outline" stores={basicShops} />
        <StoreRail title="Vendor Shops" icon="cube-outline" stores={vendorShops} />

        {/* ── Category Section ── */}
        <SectionHeading title="Categories" icon="grid-outline" />

        {/* Category horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          style={{ marginBottom: 24 }}
        >
          {CATEGORIES.map((item) => (
            <CategoryChip
              key={item.id}
              item={item}
              active={activeCategory === item.id}
              onPress={() =>
                setActiveCategory((prev) => (prev === item.id ? null : item.id))
              }
            />
          ))}
        </ScrollView>

        {/* ── Products for selected category ── */}
        <SectionHeading
          title={
            activeCategory
              ? CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "Products"
              : "Featured"
          }
          icon={activeCategory ? "pricetag-outline" : "star-outline"}
          actionLabel={activeCategory ? "Clear" : undefined}
          onAction={activeCategory ? () => setActiveCategory(null) : undefined}
        />

        {/* Products Grid */}
        <View style={styles.grid}>
          {pairs.map((pair, i) => (
            <View key={i} style={styles.row}>
              {pair.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  brand={product.brand}
                  image={product.imageUrl ? { uri: product.imageUrl } : doorstepLogo}
                  shopType={product.shopType as any}
                  shopName={product.shopName}
                  availableItems={product.availableItems}
                  onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}
                />
              ))}
              {pair.length === 1 && <View style={styles.emptyCard} />}
            </View>
          ))}
          {displayed.length === 0 && (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.foreground }]}>No live products found</Text>
              <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
                Products appear here after a merchant imports or creates them.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },

  // Banner
  banner: {
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: "row",
    padding: 16,
    marginBottom: 24,
    overflow: "hidden",
    alignItems: "center",
    gap: 14,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bannerContent: { flex: 1, gap: 4 },
  bannerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26 },
  bannerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
  shopNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  shopNowText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  bannerMark: {
    width: 82,
    height: 82,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerImg: { width: 54, height: 54, borderRadius: 12 },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  seeAll: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // Category horizontal scroll
  categoryScroll: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 16,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
  },
  chipActive: {
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  // Products
  grid: { gap: 16 },
  row: { flexDirection: "row", gap: 16, marginBottom: 0 },
  emptyCard: { flex: 1 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 18,
    gap: 8,
    borderRadius: 16,
    borderWidth: 2,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  emptyText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptySubText: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },

  // Store rails
  storeRail: {
    gap: 12,
    paddingRight: 16,
    paddingVertical: 4,
  },
  storeCard: {
    width: 180,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  storeCover: {
    height: 100,
    position: "relative",
    overflow: "hidden",
  },
  storeCoverImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignSelf: "center",
  },
  storeCoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  storeBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  storeBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  storeInfo: {
    padding: 12,
    gap: 4,
  },
  storeName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  storeTagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  storeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  storeRating: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 100,
  },
  statusText: {
    color: "#22C55E",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },

  // Popup menu
  popupCard: {
    position: "absolute",
    left: 12,
    minWidth: 210,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    transformOrigin: "top left",
  },
  popupItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  popupItemLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
});
