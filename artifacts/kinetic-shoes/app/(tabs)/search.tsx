import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useSearch } from "@/hooks/useSearch";
import { useSearchContext } from "@/context/SearchContext";
import { TRENDING_SEARCHES } from "@/data/searchData";
import { FilterTabs } from "@/components/search/FilterTabs";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { SearchSkeletonList } from "@/components/search/SkeletonCard";

// ─── Trending Chip ─────────────────────────────────────────────────────────────

function TrendingChip({
  label,
  onPress,
  index,
}: {
  label: string;
  onPress: () => void;
  index: number;
}) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeIn.delay(index * 40).duration(300)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: pressed ? colors.primary + "20" : colors.muted,
            borderColor: pressed ? colors.primary + "60" : colors.border,
          },
        ]}
      >
        <Ionicons name="trending-up" size={12} color={colors.primary} />
        <Text
          style={[styles.chipText, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Recent Search Row ─────────────────────────────────────────────────────────

function RecentRow({
  label,
  onPress,
  onRemove,
}: {
  label: string;
  onPress: () => void;
  onRemove: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recentRow,
        { backgroundColor: pressed ? colors.muted : "transparent" },
      ]}
    >
      <Feather name="clock" size={14} color={colors.mutedForeground} />
      <Text
        style={[styles.recentText, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={styles.removeBtn}
      >
        <Feather name="x" size={14} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyResults({ query }: { query: string }) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.emptyContainer}
    >
      <Feather name="search" size={40} color={colors.border} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        No results for "{query}"
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
        Try different keywords, check the spelling, or use a Chichewa word
      </Text>
    </Animated.View>
  );
}

// ─── Intent Banner ─────────────────────────────────────────────────────────────

function IntentBanner({ text }: { text: string }) {
  const colors = useColors();
  return (
    <Animated.View
      entering={SlideInDown.duration(250)}
      style={[styles.intentBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
    >
      <Ionicons name="bulb-outline" size={14} color={colors.primary} />
      <Text style={[styles.intentText, { color: colors.primary }]}>{text}</Text>
    </Animated.View>
  );
}

// ─── Search Screen ─────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    query,
    setQuery,
    results,
    loading,
    intent,
    activeFilter,
    setActiveFilter,
    counts,
  } = useSearch();

  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } =
    useSearchContext();

  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Search bar animation
  const cancelWidth = useSharedValue(0);
  const cancelOpacity = useSharedValue(0);

  const cancelStyle = useAnimatedStyle(() => ({
    width: cancelWidth.value,
    opacity: cancelOpacity.value,
  }));

  const onFocus = useCallback(() => {
    setIsFocused(true);
    cancelWidth.value = withSpring(68, { damping: 18, stiffness: 280 });
    cancelOpacity.value = withTiming(1, { duration: 200 });
  }, [cancelWidth, cancelOpacity]);

  const onBlur = useCallback(() => {
    if (query.length === 0) {
      setIsFocused(false);
      cancelWidth.value = withSpring(0, { damping: 18, stiffness: 280 });
      cancelOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [query, cancelWidth, cancelOpacity]);

  const handleCancel = useCallback(() => {
    Keyboard.dismiss();
    setQuery("");
    setIsFocused(false);
    cancelWidth.value = withSpring(0, { damping: 18, stiffness: 280 });
    cancelOpacity.value = withTiming(0, { duration: 150 });
  }, [setQuery, cancelWidth, cancelOpacity]);

  const handleSearchSubmit = useCallback(() => {
    if (query.trim().length > 0) {
      addRecentSearch(query.trim());
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }, [query, addRecentSearch]);

  const handleChipPress = useCallback(
    (label: string) => {
      setQuery(label);
      addRecentSearch(label);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      inputRef.current?.blur();
    },
    [setQuery, addRecentSearch]
  );

  const handleResultPress = useCallback(() => {
    if (query.trim()) addRecentSearch(query.trim());
  }, [query, addRecentSearch]);

  // Refocus check
  useFocusEffect(
    useCallback(() => {
      return () => {};
    }, [])
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isSearching = query.length > 0;
  const hasResults = results.length > 0;

  // Build intent hint string
  let intentHint: string | null = null;
  if (intent && isSearching) {
    if (intent.isGeo) intentHint = "Showing nearby results first";
    else if (intent.isProfessional) intentHint = "Found service professionals matching your search";
    else if (intent.isService) intentHint = "Found services matching your needs";
    else if (intent.isPriceSensitive) intentHint = "Showing budget-friendly options first";
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.searchRow}>
          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.input,
                borderColor: isFocused ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather
              name="search"
              size={17}
              color={isFocused ? colors.primary : colors.mutedForeground}
            />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search products, stores, professionals..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              onFocus={onFocus}
              onBlur={onBlur}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && Platform.OS !== "ios" && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Feather name="x-circle" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Cancel Button */}
          <Animated.View style={cancelStyle}>
            <Pressable onPress={handleCancel} style={styles.cancelBtn}>
              <Text
                style={[styles.cancelText, { color: colors.primary }]}
                numberOfLines={1}
              >
                Cancel
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {/* ── Active Search ── */}
      {isSearching ? (
        <View style={styles.resultsWrapper}>
          {/* Filter Tabs */}
          <FilterTabs
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />

          {/* Intent banner */}
          {intentHint && <IntentBanner text={intentHint} />}

          {/* Results */}
          {loading ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
            >
              <SearchSkeletonList count={5} />
            </ScrollView>
          ) : hasResults ? (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <Animated.View
                  entering={FadeIn.delay(index * 30).duration(250)}
                  style={{ marginBottom: 8 }}
                >
                  <SearchResultCard
                    result={item}
                    query={query}
                    onPress={handleResultPress}
                  />
                </Animated.View>
              )}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingTop: 8,
                paddingBottom: 120,
              }}
              ListHeaderComponent={
                <Text
                  style={[
                    styles.resultCount,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {counts.all} result{counts.all !== 1 ? "s" : ""} for "{query}"
                </Text>
              }
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
            >
              <EmptyResults query={query} />
            </ScrollView>
          )}
        </View>
      ) : (
        /* ── Home State ── */
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.homeContent,
            { paddingBottom: Platform.OS === "web" ? 120 : 100 },
          ]}
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <Animated.View entering={FadeIn.duration(300)}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  Recent
                </Text>
                <Pressable onPress={clearRecentSearches}>
                  <Text
                    style={[
                      styles.clearText,
                      { color: colors.primary },
                    ]}
                  >
                    Clear all
                  </Text>
                </Pressable>
              </View>
              {recentSearches.slice(0, 6).map((s) => (
                <RecentRow
                  key={s}
                  label={s}
                  onPress={() => handleChipPress(s)}
                  onRemove={() => removeRecentSearch(s)}
                />
              ))}
            </Animated.View>
          )}

          {/* Trending */}
          <Animated.View entering={FadeIn.delay(60).duration(300)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Trending now
              </Text>
              <Ionicons name="flame" size={15} color="#FF6B35" />
            </View>
            <View style={styles.chipsGrid}>
              {TRENDING_SEARCHES.map((label, i) => (
                <TrendingChip
                  key={label}
                  label={label}
                  index={i}
                  onPress={() => handleChipPress(label)}
                />
              ))}
            </View>
          </Animated.View>

          {/* Quick Category Access */}
          <Animated.View entering={FadeIn.delay(120).duration(300)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Browse by category
              </Text>
            </View>
            <View style={styles.categoryGrid}>
              {QUICK_CATEGORIES.map((cat, i) => (
                <Animated.View
                  key={cat.id}
                  entering={FadeIn.delay(i * 50 + 120).duration(300)}
                  style={{ flex: 1 }}
                >
                  <Pressable
                    onPress={() => handleChipPress(cat.label)}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      {
                        backgroundColor: pressed
                          ? cat.color + "30"
                          : cat.color + "15",
                        borderColor: cat.color + "40",
                      },
                    ]}
                  >
                    <Feather
                      name={cat.icon as any}
                      size={22}
                      color={cat.color}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Tip Banner */}
          <Animated.View entering={FadeIn.delay(200).duration(300)}>
            <View
              style={[
                styles.tipBanner,
                {
                  backgroundColor: colors.primary + "10",
                  borderColor: colors.primary + "25",
                },
              ]}
            >
              <Ionicons name="bulb-outline" size={16} color={colors.primary} />
              <Text
                style={[styles.tipText, { color: colors.mutedForeground }]}
              >
                Try searching in{" "}
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                  Chichewa
                </Text>
                : "foni" for phones, "nsapato" for shoes, "chakudya" for food
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Quick Categories ──────────────────────────────────────────────────────────

const QUICK_CATEGORIES = [
  { id: "electronics", label: "Electronics", icon: "smartphone", color: "#0F3460" },
  { id: "fashion", label: "Fashion", icon: "shopping-bag", color: "#C850C0" },
  { id: "food", label: "Food", icon: "coffee", color: "#FF6B35" },
  { id: "services", label: "Services", icon: "tool", color: "#667EEA" },
  { id: "sports", label: "Sports", icon: "activity", color: "#56CCF2" },
  { id: "beauty", label: "Beauty", icon: "heart", color: "#FC5C7D" },
];

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: "100%",
    paddingVertical: 0,
  },
  cancelBtn: {
    paddingHorizontal: 4,
    paddingVertical: 10,
    overflow: "hidden",
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  resultsWrapper: {
    flex: 1,
  },
  resultCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 4,
  },
  homeContent: {
    paddingTop: 8,
    gap: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  clearText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 11,
    gap: 12,
  },
  recentText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  removeBtn: {
    padding: 2,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 10,
  },
  categoryCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    minWidth: 90,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  tipBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  intentBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  intentText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
