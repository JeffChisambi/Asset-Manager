import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryPill } from "@/components/CategoryPill";
import { ProductCard } from "@/components/ProductCard";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = ["All", "Nike", "Adidas", "Puma", "Fila", "New Balance"];

const nikeAir90 = require("@/assets/images/nike_air90.png");
const airJordan3 = require("@/assets/images/air_jordan3.png");
const nikeDunk = require("@/assets/images/nike_dunk.png");
const adidasNmd = require("@/assets/images/adidas_nmd.png");
const bannerShoe = require("@/assets/images/banner_shoe.png");

const ALL_PRODUCTS = [
  { id: "1", name: "Nike Air 90", price: 225.0, brand: "Nike", image: nikeAir90 },
  { id: "2", name: "Air Jordan 3", price: 200.0, brand: "Nike", image: airJordan3 },
  { id: "3", name: "Nike Dunk Low", price: 180.0, brand: "Nike", image: nikeDunk },
  { id: "4", name: "Adidas NMD R1", price: 165.0, brand: "Adidas", image: adidasNmd },
  { id: "5", name: "Nike Air Force", price: 140.0, brand: "Nike", image: nikeAir90 },
  { id: "6", name: "Adidas Ultra", price: 190.0, brand: "Adidas", image: adidasNmd },
  { id: "7", name: "Jordan Retro", price: 210.0, brand: "Nike", image: airJordan3 },
  { id: "8", name: "Nike Dunk High", price: 175.0, brand: "Nike", image: nikeDunk },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchText, setSearchText] = useState("");

  const filtered =
    activeCategory === "All"
      ? ALL_PRODUCTS
      : ALL_PRODUCTS.filter((p) => p.brand === activeCategory);

  const displayed = searchText
    ? filtered.filter((p) =>
        p.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : filtered;

  const pairs: (typeof ALL_PRODUCTS)[] = [];
  for (let i = 0; i < displayed.length; i += 2) {
    pairs.push(displayed.slice(i, i + 2));
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: 100 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.iconBtn}>
            <MaterialCommunityIcons
              name="view-grid-outline"
              size={24}
              color={colors.foreground}
            />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Kinetic Shoes
          </Text>
          <Pressable style={styles.iconBtn}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={colors.foreground}
            />
          </Pressable>
        </View>

        {/* Search Bar */}
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
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <Ionicons name="options-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Sale Banner */}
        <View style={[styles.banner, { backgroundColor: colors.banner }]}>
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, { color: colors.bannerText }]}>
              Year - End Sale
            </Text>
            <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
              Get upto 90% off
            </Text>
            <Pressable
              style={[styles.shopNowBtn, { backgroundColor: colors.foreground }]}
            >
              <Text style={styles.shopNowText}>Shop Now</Text>
            </Pressable>
          </View>
          <Image source={bannerShoe} style={styles.bannerImg} resizeMode="contain" />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pills}
          >
            {CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onPress={() => setActiveCategory(cat)}
              />
            ))}
          </ScrollView>
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
                />
              ))}
              {pair.length === 1 && <View style={styles.emptyCard} />}
            </View>
          ))}
          {displayed.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons
                name="search-outline"
                size={40}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No shoes found
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    borderRadius: 20,
    flexDirection: "row",
    paddingLeft: 20,
    paddingVertical: 20,
    marginBottom: 20,
    overflow: "hidden",
    alignItems: "center",
  },
  bannerContent: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    lineHeight: 26,
  },
  bannerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  shopNowBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
  },
  shopNowText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  bannerImg: {
    width: 150,
    height: 130,
  },
  section: {
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  pills: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  grid: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 0,
  },
  emptyCard: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
});
