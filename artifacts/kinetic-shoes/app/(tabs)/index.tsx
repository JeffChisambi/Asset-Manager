import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  FadeInDown,
  Easing,
} from "react-native-reanimated";

import { ProductCard } from "@/components/ProductCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { SUPER_STORES } from "@/data/superstores";
import { StoreService } from "@/services/store/store.service";
import { Store } from "@/types/store";
import { LinearGradient } from "expo-linear-gradient";

// ─── Images ───────────────────────────────────────────────────────────────────
const doorstepLogo           = require("@/assets/logo and icon/doorsteplogo.png");
const categoryFoodImg        = require("@/assets/images/category_food.png");
const categoryFashionImg     = require("@/assets/images/category_fashion.png");
const categoryHousingImg     = require("@/assets/images/category_housing.png");
const categoryFurnitureImg   = require("@/assets/images/category_furniture.png");
const categoryElectronicsImg = require("@/assets/images/category_electronics.png");
const nikeAir90 = require("@/assets/images/nike_air90.png");
const airJordan3 = require("@/assets/images/air_jordan3.png");
const nikeDunk = require("@/assets/images/nike_dunk.png");
const adidasNmd = require("@/assets/images/adidas_nmd.png");
const bannerShoe = require("@/assets/images/banner_shoe.png");

// ─── Data ─────────────────────────────────────────────────────────────────────
type Category = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  image?: ReturnType<typeof require>;
};

const CATEGORIES: Category[] = [
  { id: "food",           label: "Food",                    emoji: "🍔", color: "#FF6B35", image: categoryFoodImg        },
  { id: "fashion",        label: "Clothing & Fashion",      emoji: "👗", color: "#C850C0", image: categoryFashionImg     },
  { id: "housing",        label: "Housing & Home",          emoji: "🏠", color: "#4776E6", image: categoryHousingImg     },
  { id: "furniture",      label: "Furniture",               emoji: "🛋️", color: "#8B6914", image: categoryFurnitureImg   },
  { id: "electronics",    label: "Electronics",             emoji: "📱", color: "#0F3460", image: categoryElectronicsImg },
  { id: "transportation", label: "Transportation",          emoji: "🚗", color: "#1A6B4A" },
  { id: "health",         label: "Health",                  emoji: "💊", color: "#E84393" },
  { id: "beauty",         label: "Beauty & Personal Care",  emoji: "💄", color: "#F953C6" },
  { id: "education",      label: "Education",               emoji: "📚", color: "#4A80F0" },
  { id: "entertainment",  label: "Entertainment",           emoji: "🎮", color: "#6C3483" },
  { id: "travel",         label: "Travel",                  emoji: "✈️", color: "#00C6FF" },
  { id: "financial",      label: "Financial Services",      emoji: "💳", color: "#1A2980" },
  { id: "pets",           label: "Pets",                    emoji: "🐾", color: "#F7971E" },
  { id: "baby",           label: "Baby & Parenting",        emoji: "🍼", color: "#FC5C7D" },
  { id: "sports",         label: "Sports & Fitness",        emoji: "🏋️", color: "#56CCF2" },
  { id: "business",       label: "Business & Industrial",   emoji: "🏭", color: "#485563" },
  { id: "agriculture",    label: "Agriculture",             emoji: "🌾", color: "#4CAF50" },
  { id: "construction",   label: "Construction",            emoji: "🔨", color: "#E65C00" },
  { id: "energy",         label: "Energy & Utilities",      emoji: "⚡", color: "#F9D423" },
  { id: "digital",        label: "Digital Products",        emoji: "💻", color: "#4776E6" },
  { id: "communication",  label: "Communication",           emoji: "📡", color: "#11998E" },
  { id: "security",       label: "Security",                emoji: "🔒", color: "#373B44" },
  { id: "gifts",          label: "Gifts & Luxury",          emoji: "🎁", color: "#C6426E" },
  { id: "services",       label: "Services",                emoji: "🛠️", color: "#667EEA" },
];

type Product = {
  id: string;
  name: string;
  price: number;
  brand: string;
  image: ReturnType<typeof require>;
  shopType: "Super Store" | "Basic Store" | "Vendor";
  shopName: string;
  shopId?: string;
  availableItems: number;
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: "sm-1", name: "Nike Air 90",    price: 225.0, brand: "Nike",   image: nikeAir90,  shopType: "Super Store", shopName: "SportsMega Mall",   shopId: "sportsmega", availableItems: 14 },
  { id: "2",    name: "Air Jordan 3",   price: 200.0, brand: "Nike",   image: airJordan3, shopType: "Basic Store", shopName: "KickZone Store",    availableItems: 7  },
  { id: "sm-3", name: "Nike Dunk Low",  price: 180.0, brand: "Nike",   image: nikeDunk,   shopType: "Super Store", shopName: "SportsMega Mall",   shopId: "sportsmega", availableItems: 22 },
  { id: "4",    name: "Adidas NMD R1",  price: 165.0, brand: "Adidas", image: adidasNmd,  shopType: "Basic Store", shopName: "StepUp Boutique",   availableItems: 9  },
  { id: "sm-5", name: "Nike Air Force", price: 140.0, brand: "Nike",   image: nikeAir90,  shopType: "Super Store", shopName: "SportsMega Mall",   shopId: "sportsmega", availableItems: 22 },
  { id: "6",    name: "Adidas Ultra",   price: 190.0, brand: "Adidas", image: adidasNmd,  shopType: "Vendor",      shopName: "AdiWorld Seller",   availableItems: 5  },
  { id: "7",    name: "Jordan Retro",   price: 210.0, brand: "Nike",   image: airJordan3, shopType: "Basic Store", shopName: "RetroKicks Shop",   availableItems: 11 },
  { id: "tw-2", name: "Nike Dunk High", price: 175.0, brand: "Nike",   image: nikeDunk,   shopType: "Super Store", shopName: "TechWorld Mall",    shopId: "techworld", availableItems: 18 },
];

// Per-category product overrides
const CATEGORY_PRODUCTS: Record<string, Product[]> = {
  food: [
    { id: "f1", name: "Organic Bundle",   price: 29.99, brand: "FreshMart",  image: categoryFoodImg, shopType: "Super Store", shopName: "FreshMart Hypermarket", availableItems: 80 },
    { id: "f2", name: "Spice Pack",       price: 14.99, brand: "SpiceWorld", image: categoryFoodImg, shopType: "Vendor",      shopName: "Mama Spices",           availableItems: 42 },
    { id: "f3", name: "Bakery Box",       price: 19.99, brand: "BakeCo",     image: categoryFoodImg, shopType: "Basic Store", shopName: "Golden Bakery",         availableItems: 15 },
    { id: "f4", name: "Dairy Essentials", price: 22.50, brand: "FarmFresh",  image: categoryFoodImg, shopType: "Basic Store", shopName: "Farm2Door Shop",        availableItems: 30 },
  ],
  fashion: [
    { id: "c1", name: "Summer Dress",  price: 89.99,  brand: "Zara",    image: categoryFashionImg, shopType: "Super Store", shopName: "Zara Flagship Mall",  availableItems: 20 },
    { id: "c2", name: "Denim Jacket",  price: 120.0,  brand: "Levi's",  image: categoryFashionImg, shopType: "Basic Store", shopName: "Levi's Corner Store", availableItems: 8  },
    { id: "c3", name: "Slim Chinos",   price: 65.00,  brand: "H&M",     image: categoryFashionImg, shopType: "Super Store", shopName: "H&M City Center",     availableItems: 35 },
    { id: "c4", name: "Graphic Tee",   price: 35.00,  brand: "Supreme", image: categoryFashionImg, shopType: "Vendor",      shopName: "UrbanDrip Vendor",    availableItems: 4  },
  ],
  housing: [
    { id: "hw1", name: "Smart Doorbell",   price: 89.99,  brand: "Ring",       image: categoryHousingImg, shopType: "Basic Store", shopName: "HomeSecure Shop",     availableItems: 12 },
    { id: "hw2", name: "LED Ceiling Light",price: 45.00,  brand: "Philips",    image: categoryHousingImg, shopType: "Super Store", shopName: "HomePro Hypermarket", availableItems: 30 },
    { id: "hw3", name: "Window Blind Set", price: 75.00,  brand: "Decora",     image: categoryHousingImg, shopType: "Vendor",      shopName: "HomeDecor Vendor",    availableItems: 5  },
    { id: "hw4", name: "Wall Paint 5L",    price: 38.00,  brand: "Dulux",      image: categoryHousingImg, shopType: "Basic Store", shopName: "PaintWorld Store",    availableItems: 20 },
  ],
  furniture: [
    { id: "fu1", name: "3-Seat Sofa",       price: 599.0, brand: "IKEA",     image: categoryFurnitureImg, shopType: "Super Store", shopName: "FurnitureMega Mall",  availableItems: 4  },
    { id: "fu2", name: "Dining Table Set",  price: 420.0, brand: "Woood",    image: categoryFurnitureImg, shopType: "Basic Store", shopName: "TimberCraft Store",   availableItems: 2  },
    { id: "fu3", name: "Bookshelf 5-Tier",  price: 180.0, brand: "IKEA",     image: categoryFurnitureImg, shopType: "Super Store", shopName: "FurnitureMega Mall",  availableItems: 9  },
    { id: "fu4", name: "Office Chair",      price: 250.0, brand: "Ergohuman", image: categoryFurnitureImg, shopType: "Vendor",      shopName: "SitRight Vendor",     availableItems: 3  },
  ],
  electronics: [
    { id: "e1", name: "Wireless Buds", price: 149.99, brand: "Sony",    image: categoryElectronicsImg, shopType: "Super Store", shopName: "TechWorld Mall",      availableItems: 25 },
    { id: "e2", name: "Smart Watch",   price: 299.99, brand: "Samsung", image: categoryElectronicsImg, shopType: "Super Store", shopName: "Samsung Experience",  availableItems: 10 },
    { id: "e3", name: "Power Bank",    price: 49.99,  brand: "Anker",   image: categoryElectronicsImg, shopType: "Basic Store", shopName: "GadgetZone Shop",     availableItems: 50 },
    { id: "e4", name: "USB-C Hub",     price: 39.99,  brand: "Belkin",  image: categoryElectronicsImg, shopType: "Vendor",      shopName: "TechParts Vendor",    availableItems: 7  },
  ],
  sports: [
    { id: "s1", name: "Running Shoes", price: 110.0,  brand: "Nike",      image: categoryFashionImg, shopType: "Super Store", shopName: "SportsMega Mall",    availableItems: 18 },
    { id: "s2", name: "Gym Gloves",    price: 25.00,  brand: "Adidas",    image: categoryFashionImg, shopType: "Vendor",      shopName: "FitGear Vendor",     availableItems: 11 },
    { id: "s3", name: "Yoga Mat",      price: 45.00,  brand: "Lululemon", image: categoryFashionImg, shopType: "Basic Store", shopName: "ActiveLife Store",   availableItems: 6  },
    { id: "s4", name: "Protein Shake", price: 55.00,  brand: "Optimum",   image: categoryFoodImg,    shopType: "Basic Store", shopName: "NutriShop",          availableItems: 30 },
  ],
  beauty: [
    { id: "b1", name: "Face Serum",   price: 79.99, brand: "CeraVe",  image: categoryFoodImg, shopType: "Basic Store", shopName: "Beauty Essentials",  availableItems: 14 },
    { id: "b2", name: "Lip Palette",  price: 42.00, brand: "MAC",     image: categoryFoodImg, shopType: "Super Store", shopName: "Beauty Mega Store",  availableItems: 22 },
    { id: "b3", name: "Hair Mask",    price: 28.00, brand: "OGX",     image: categoryFoodImg, shopType: "Vendor",      shopName: "GlowUp Vendor",      availableItems: 5  },
    { id: "b4", name: "Perfume 50ml", price: 95.00, brand: "Chanel",  image: categoryFoodImg, shopType: "Super Store", shopName: "Luxury Scents Mall", availableItems: 3  },
  ],
  health: [
    { id: "h1", name: "Vitamin C 1000",   price: 18.99, brand: "Nature's",  image: categoryHousingImg, shopType: "Basic Store", shopName: "HealthPlus Pharmacy", availableItems: 60 },
    { id: "h2", name: "Blood Pressure M", price: 55.00, brand: "Omron",     image: categoryElectronicsImg, shopType: "Super Store", shopName: "MedCare Superstore",  availableItems: 9  },
    { id: "h3", name: "First Aid Kit",    price: 35.00, brand: "Johnson's", image: categoryHousingImg, shopType: "Basic Store", shopName: "SafetyFirst Shop",    availableItems: 17 },
    { id: "h4", name: "Thermometer",      price: 22.00, brand: "Braun",     image: categoryElectronicsImg, shopType: "Vendor",      shopName: "MediGadget Vendor",   availableItems: 4  },
  ],
  pets: [
    { id: "p1", name: "Dog Food 5kg", price: 38.00, brand: "Pedigree", image: categoryFoodImg,      shopType: "Super Store", shopName: "PetWorld Hypermarket", availableItems: 45 },
    { id: "p2", name: "Cat Toy Set",  price: 15.99, brand: "PetSmart", image: categoryFurnitureImg, shopType: "Basic Store", shopName: "Happy Paws Shop",       availableItems: 12 },
    { id: "p3", name: "Pet Shampoo",  price: 12.99, brand: "Hartz",    image: categoryFoodImg,      shopType: "Vendor",      shopName: "PetCare Vendor",        availableItems: 8  },
    { id: "p4", name: "Flea Collar",  price: 20.00, brand: "Seresto",  image: categoryHousingImg,   shopType: "Basic Store", shopName: "VetSupplies Store",     availableItems: 19 },
  ],
  gifts: [
    { id: "g1", name: "Gift Hamper",    price: 150.0,  brand: "Premium Co", image: categoryFoodImg,        shopType: "Super Store", shopName: "LuxGifts Mall",      availableItems: 6  },
    { id: "g2", name: "Scented Candle", price: 45.00,  brand: "Yankee",     image: categoryHousingImg,     shopType: "Basic Store", shopName: "Aroma & Co Shop",    availableItems: 23 },
    { id: "g3", name: "Jewellery Box",  price: 220.0,  brand: "Tiffany",    image: categoryFurnitureImg,   shopType: "Super Store", shopName: "Prestige Jewellers", availableItems: 2  },
    { id: "g4", name: "Watch Box Set",  price: 310.0,  brand: "Fossil",     image: categoryElectronicsImg, shopType: "Vendor",      shopName: "TimeKeeper Vendor",  availableItems: 1  },
  ],
};

// ─── CategoryChip ──────────────────────────────────────────────────────────────
function CategoryChip({
  item,
  active,
  onPress,
}: {
  item: Category;
  index: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: active ? item.color : item.color + "18",
          borderColor: active ? item.color : item.color + "55",
        },
      ]}
    >
      <Text style={styles.chipEmoji}>{item.emoji}</Text>
      <Text
        style={[styles.chipLabel, { color: active ? "#FFFFFF" : item.color }]}
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
        onClose();
        await AsyncStorage.removeItem("hasLoggedIn");
        setTimeout(() => router.replace("/login"), 180);
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
export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [basicShops, setBasicShops] = useState<Store[]>([]);
  const [vendorShops, setVendorShops] = useState<Store[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function fetchShops() {
        try {
          const basics = await StoreService.searchStores(undefined, "basic_shop");
          const vendors = await StoreService.searchStores(undefined, "vendor");
          setBasicShops(basics);
          setVendorShops(vendors);
        } catch (err) {
          console.warn("Failed to load DB stores:", err);
        }
      }
      fetchShops();
    }, [])
  );

  const [menuVisible, setMenuVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  // Position the popup just below the header icon
  const menuAnchorTop = topPad + 52;

  const baseProducts: Product[] =
    activeCategory && CATEGORY_PRODUCTS[activeCategory]
      ? CATEGORY_PRODUCTS[activeCategory]
      : DEFAULT_PRODUCTS;

  const displayed = searchText
    ? baseProducts.filter((p) => p.name.toLowerCase().includes(searchText.toLowerCase()))
    : baseProducts;


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
            style={styles.iconBtn}
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
          <Pressable 
            style={styles.iconBtn}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.muted }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search"
              placeholderTextColor={colors.mutedForeground}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <Pressable
            style={[styles.filterBtn, { backgroundColor: colors.foreground }]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/services");
            }}
          >
            <Ionicons name="grid-outline" size={20} color={colors.background} />
          </Pressable>
        </View>

        {/* ── Sale Banner ── */}
        <View style={[styles.banner, { backgroundColor: colors.banner }]}>
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, { color: colors.bannerText }]}>Year-End Sale</Text>
            <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>Get up to 90% off</Text>
            <Pressable style={[styles.shopNowBtn, { backgroundColor: colors.foreground }]}>
              <Text style={[styles.shopNowText, { color: colors.background }]}>Shop Now</Text>
            </Pressable>
          </View>
          <Image source={bannerShoe} style={styles.bannerImg} resizeMode="contain" />
        </View>

        {/* ── Super Store Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🏬 Super Stores</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.superStoreScroll}
          style={{ marginBottom: 24 }}
        >
          {SUPER_STORES.map((store) => (
            <Pressable
              key={store.id}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/superstore/[id]", params: { id: store.id } });
              }}
              style={[styles.superStoreCard, { borderColor: store.accentColor + "55" }]}
            >
              {/* Card header: cover image (top half) or solid accent */}
              <View style={[styles.superStoreGradient, { backgroundColor: store.accentColor, overflow: "hidden" }]}>
                {store.coverImage ? (
                  <Image
                    source={store.coverImage}
                    style={styles.superStoreCoverImg}
                    resizeMode="cover"
                    fadeDuration={300}
                    {...(Platform.OS === "web" ? ({ loading: "lazy" } as any) : {})}
                  />
                ) : null}
                <View style={styles.superStoreScrim} />
              </View>
              <View style={styles.superStoreInfo}>
                <Text style={[styles.superStoreName, { color: colors.foreground }]} numberOfLines={1}>{store.name}</Text>
                <Text style={[styles.superStoreCategory, { color: colors.mutedForeground }]} numberOfLines={1}>{store.category}</Text>
                <View style={styles.superStoreRow}>
                  <Ionicons name="star" size={11} color="#FFB300" />
                  <Text style={[styles.superStoreRating, { color: colors.foreground }]}>{store.rating}</Text>
                  <View style={[styles.openDot, { backgroundColor: store.openNow ? "#22C55E" : "#EF4444" }]} />
                  <Text style={[styles.superStoreOpen, { color: store.openNow ? "#22C55E" : "#EF4444" }]}>
                    {store.openNow ? "Open" : "Closed"}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Basic Stores Section ── */}
        {basicShops.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🏪 Basic Stores</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.superStoreScroll}
              style={{ marginBottom: 24 }}
            >
              {basicShops.map((store) => (
                <Pressable
                  key={store.id}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/store/[id]", params: { id: store.id } });
                  }}
                  style={[styles.superStoreCard, { borderColor: (store.accent_color || "#4A80F0") + "55" }]}
                >
                  <View style={[styles.superStoreGradient, { backgroundColor: store.accent_color || "#4A80F0", overflow: "hidden" }]}>
                    {store.cover_image_url ? (
                      <Image
                        source={{ uri: store.cover_image_url }}
                        style={styles.superStoreCoverImg}
                        resizeMode="cover"
                        fadeDuration={300}
                      />
                    ) : (
                      <LinearGradient
                        colors={[store.cover_gradient_start || store.accent_color || "#4A80F0", store.cover_gradient_end || store.accent_color || "#4A80F0"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <View style={styles.superStoreScrim} />
                    <View style={{ position: "absolute", bottom: -10, right: 10 }}>
                      <Text style={{ fontSize: 44 }}>{store.emoji || "🏪"}</Text>
                    </View>
                  </View>
                  <View style={styles.superStoreInfo}>
                    <Text style={[styles.superStoreName, { color: colors.foreground }]} numberOfLines={1}>{store.name}</Text>
                    <Text style={[styles.superStoreCategory, { color: colors.mutedForeground }]} numberOfLines={1}>{store.tagline || "Basic Store"}</Text>
                    <View style={styles.superStoreRow}>
                      <Ionicons name="star" size={11} color="#FFB300" />
                      <Text style={[styles.superStoreRating, { color: colors.foreground }]}>5.0</Text>
                      <View style={[styles.openDot, { backgroundColor: "#22C55E" }]} />
                      <Text style={[styles.superStoreOpen, { color: "#22C55E" }]}>Open</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Vendor Shops Section ── */}
        {vendorShops.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📦 Vendor Shops</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.superStoreScroll}
              style={{ marginBottom: 24 }}
            >
              {vendorShops.map((store) => (
                <Pressable
                  key={store.id}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/store/[id]", params: { id: store.id } });
                  }}
                  style={[styles.superStoreCard, { borderColor: (store.accent_color || "#F7971E") + "55" }]}
                >
                  <View style={[styles.superStoreGradient, { backgroundColor: store.accent_color || "#F7971E", overflow: "hidden" }]}>
                    {store.cover_image_url ? (
                      <Image
                        source={{ uri: store.cover_image_url }}
                        style={styles.superStoreCoverImg}
                        resizeMode="cover"
                        fadeDuration={300}
                      />
                    ) : (
                      <LinearGradient
                        colors={[store.cover_gradient_start || store.accent_color || "#F7971E", store.cover_gradient_end || store.accent_color || "#F7971E"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <View style={styles.superStoreScrim} />
                    <View style={{ position: "absolute", bottom: -10, right: 10 }}>
                      <Text style={{ fontSize: 44 }}>{store.emoji || "📦"}</Text>
                    </View>
                  </View>
                  <View style={styles.superStoreInfo}>
                    <Text style={[styles.superStoreName, { color: colors.foreground }]} numberOfLines={1}>{store.name}</Text>
                    <Text style={[styles.superStoreCategory, { color: colors.mutedForeground }]} numberOfLines={1}>{store.tagline || "Vendor Shop"}</Text>
                    <View style={styles.superStoreRow}>
                      <Ionicons name="star" size={11} color="#FFB300" />
                      <Text style={[styles.superStoreRating, { color: colors.foreground }]}>5.0</Text>
                      <View style={[styles.openDot, { backgroundColor: "#22C55E" }]} />
                      <Text style={[styles.superStoreOpen, { color: "#22C55E" }]}>Open</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Category Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category</Text>
          <Pressable>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>

        {/* Category horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          style={{ marginBottom: 24 }}
        >
          {CATEGORIES.map((item, _index) => (
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
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {activeCategory
              ? CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "Products"
              : "Featured"}
          </Text>
          {activeCategory && (
            <Pressable onPress={() => setActiveCategory(null)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Clear</Text>
            </Pressable>
          )}
        </View>

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
                  image={product.image}
                  shopType={product.shopType}
                  shopName={product.shopName}
                  availableItems={product.availableItems}
                  onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}
                />
              ))}
              {pair.length === 1 && <View style={styles.emptyCard} />}
            </View>
          ))}
          {displayed.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No shoes found</Text>
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
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },

  // Search
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Banner
  banner: {
    borderRadius: 20,
    flexDirection: "row",
    paddingLeft: 20,
    paddingVertical: 20,
    marginBottom: 24,
    overflow: "hidden",
    alignItems: "center",
  },
  bannerContent: { flex: 1, gap: 4 },
  bannerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26 },
  bannerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
  shopNowBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
  },
  shopNowText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bannerImg: { width: 150, height: 130 },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },

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
    borderRadius: 100,
    borderWidth: 1.5,
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },



  // Products
  grid: { gap: 16 },
  row: { flexDirection: "row", gap: 16, marginBottom: 0 },
  emptyCard: { flex: 1 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium" },

  // Super Stores
  superStoreScroll: {
    gap: 12,
    paddingRight: 16,
    paddingVertical: 4,
  },
  superStoreCard: {
    width: 180,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    backgroundColor: "transparent",
  },
  superStoreGradient: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  // Cover image fills the header area — only the center portion is visible
  superStoreCoverImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    // 200% height → image is 2× taller than the container; top half shows
    height: "200%",
    alignSelf: "center",
  },
  // Dark scrim so emoji stays readable over bright images
  superStoreScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  superStoreEmoji: { fontSize: 44 },
  superStoreInfo: {
    padding: 12,
    gap: 3,
    backgroundColor: "transparent",
  },
  superStoreName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  superStoreCategory: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  superStoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  superStoreRating: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  superStoreOpen: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  // Popup menu
  popupCard: {
    position: "absolute",
    left: 12,
    minWidth: 210,
    borderRadius: 14,
    borderWidth: 1,
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
