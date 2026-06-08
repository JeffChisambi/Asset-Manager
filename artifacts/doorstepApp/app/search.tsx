import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, FlatList, Platform, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn, FadeOut, SlideInDown,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useSearch } from "@/hooks/useSearch";
import { useSearchContext } from "@/context/SearchContext";
import { TRENDING_SEARCHES } from "@/data/searchData";
import { FilterTabs } from "@/components/search/FilterTabs";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { SearchSkeletonList } from "@/components/search/SkeletonCard";

// ─── Quick Categories ─────────────────────────────────────────────────────────
const QUICK_CATEGORIES = [
  { id: "electronics", label: "Electronics", icon: "phone-portrait-outline",  color: "#13B734" },
  { id: "fashion",     label: "Fashion",      icon: "bag-handle-outline",      color: "#C850C0" },
  { id: "food",        label: "Food",         icon: "restaurant-outline",       color: "#FF6B35" },
  { id: "services",    label: "Services",     icon: "construct-outline",        color: "#667EEA" },
  { id: "sports",      label: "Sports",       icon: "bicycle-outline",          color: "#11998E" },
  { id: "beauty",      label: "Beauty",       icon: "sparkles-outline",         color: "#FC5C7D" },
];

// ─── Trending Chip ────────────────────────────────────────────────────────────
function TrendingChip({ label, onPress, index }: { label: string; onPress: () => void; index: number }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeIn.delay(index * 40).duration(280)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ss.chip,
          {
            backgroundColor: pressed ? colors.primary + "18" : colors.card,
            borderColor: pressed ? colors.primary + "50" : colors.border,
          },
        ]}
      >
        <Ionicons name="trending-up" size={13} color={colors.primary} />
        <Text style={[ss.chipText, { color: colors.foreground }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Recent Row ───────────────────────────────────────────────────────────────
function RecentRow({ label, onPress, onRemove, index }: {
  label: string; onPress: () => void; onRemove: () => void; index: number;
}) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeIn.delay(index * 35).duration(260)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ss.recentRow,
          {
            backgroundColor: pressed ? colors.muted : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[ss.recentIconWrap, { backgroundColor: colors.muted }]}>
          <Ionicons name="time-outline" size={15} color={colors.mutedForeground} />
        </View>
        <Text style={[ss.recentText, { color: colors.foreground }]} numberOfLines={1}>
          {label}
        </Text>
        <Pressable onPress={onRemove} hitSlop={10} style={[ss.removeBtn, { backgroundColor: colors.muted }]}>
          <Ionicons name="close" size={13} color={colors.mutedForeground} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyResults({ query }: { query: string }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeIn.duration(300)} style={ss.emptyWrap}>
      <View style={[ss.emptyIconBg, { backgroundColor: colors.muted }]}>
        <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
      </View>
      <Text style={[ss.emptyTitle, { color: colors.foreground }]}>No results for "{query}"</Text>
      <Text style={[ss.emptySub, { color: colors.mutedForeground }]}>
        Try different keywords, check the spelling, or search in Chichewa
      </Text>
      <View style={[ss.emptyTip, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
        <Ionicons name="bulb-outline" size={14} color={colors.primary} />
        <Text style={[ss.emptyTipTxt, { color: colors.primary }]}>
          Try: "nsapato" for shoes · "foni" for phones
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Intent Banner ────────────────────────────────────────────────────────────
function IntentBanner({ text }: { text: string }) {
  const colors = useColors();
  return (
    <Animated.View
      entering={SlideInDown.duration(250)}
      style={[ss.intentBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "28" }]}
    >
      <View style={[ss.intentIcon, { backgroundColor: colors.primary + "20" }]}>
        <Ionicons name="bulb-outline" size={14} color={colors.primary} />
      </View>
      <Text style={[ss.intentText, { color: colors.primary }]}>{text}</Text>
    </Animated.View>
  );
}

// ─── Search Screen ────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === "web" ? 20 : insets.top;

  const { query, setQuery, results, loading, intent, activeFilter, setActiveFilter, counts } = useSearch();
  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = useSearchContext();

  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const onFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const onBlur = useCallback(() => {
    if (query.length === 0) {
      setIsFocused(false);
    }
  }, [query]);

  const handleCancel = useCallback(() => {
    Keyboard.dismiss();
    setQuery("");
    setIsFocused(false);
  }, [setQuery]);

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      addRecentSearch(query.trim());
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [query, addRecentSearch]);

  const handleChip = useCallback((label: string) => {
    setQuery(label);
    addRecentSearch(label);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.blur();
  }, [setQuery, addRecentSearch]);

  const handleResultPress = useCallback(() => {
    if (query.trim()) addRecentSearch(query.trim());
  }, [query, addRecentSearch]);

  useFocusEffect(useCallback(() => { return () => {}; }, []));

  const isSearching = query.length > 0;
  const hasResults  = results.length > 0;

  let intentHint: string | null = null;
  if (intent && isSearching) {
    if      (intent.isGeo)          intentHint = "Showing nearby results first";
    else if (intent.isProfessional) intentHint = "Found service professionals matching your search";
    else if (intent.isService)      intentHint = "Found services matching your needs";
    else if (intent.isPriceSensitive) intentHint = "Showing budget-friendly options first";
  }

  return (
    <View style={[ss.screen, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[ss.header, { paddingTop: topPad + 8 }]}>
        {/* Title row — only shown when not focused and no query */}
        {!isFocused && !isSearching && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={ss.titleRow}>
            <View>
              <Text style={[ss.screenTitle, { color: colors.foreground }]}>Discover</Text>
              <Text style={[ss.screenSub, { color: colors.mutedForeground }]}>
                Search products, stores &amp; services
              </Text>
            </View>
            <View style={[ss.locationPill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="location" size={13} color={colors.primary} />
              <Text style={[ss.locationTxt, { color: colors.foreground }]}>Lilongwe</Text>
            </View>
          </Animated.View>
        )}

        {/* Search bar row */}
        <View style={ss.searchRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: 4 }}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <View style={[
            ss.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: isFocused ? colors.primary : colors.border,
            },
          ]}>
            <Ionicons
              name={isFocused ? "search" : "search-outline"}
              size={18}
              color={isFocused ? colors.primary : colors.mutedForeground}
            />
            <TextInput
              ref={inputRef}
              style={[ss.searchInput, { color: colors.foreground }]}
              placeholder="Search products, stores, services…"
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              onFocus={onFocus}
              onBlur={onBlur}
              onSubmitEditing={handleSubmit}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && Platform.OS !== "ios" && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {(isFocused || query.length > 0) && (
            <Pressable onPress={handleCancel} style={ss.cancelBtn}>
              <Text style={[ss.cancelText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Active Search ── */}
      {isSearching ? (
        <View style={{ flex: 1 }}>
          <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={counts} />
          {intentHint && <IntentBanner text={intentHint} />}

          {loading ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}>
              <SearchSkeletonList count={5} />
            </ScrollView>
          ) : hasResults ? (
            <FlatList
              data={results}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeIn.delay(index * 30).duration(250)} style={{ marginBottom: 10 }}>
                  <SearchResultCard result={item} query={query} onPress={handleResultPress} />
                </Animated.View>
              )}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 120, paddingHorizontal: 16 }}
              ListHeaderComponent={
                <View style={[ss.resultCountRow, { borderColor: colors.border }]}>
                  <Text style={[ss.resultCountNum, { color: colors.foreground }]}>{counts.all}</Text>
                  <Text style={[ss.resultCountLabel, { color: colors.mutedForeground }]}>
                    {counts.all === 1 ? "result" : "results"} for "{query}"
                  </Text>
                </View>
              }
            />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
              <EmptyResults query={query} />
            </ScrollView>
          )}
        </View>
      ) : (

        /* ── Home / Discovery State ── */
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[ss.homeContent, { paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <Animated.View entering={FadeIn.duration(300)}>
              <View style={ss.sectionHeader}>
                <Text style={[ss.sectionTitle, { color: colors.foreground }]}>Recent</Text>
                <Pressable
                  onPress={clearRecentSearches}
                  style={[ss.clearBtn, { backgroundColor: colors.muted }]}
                >
                  <Text style={[ss.clearTxt, { color: colors.mutedForeground }]}>Clear all</Text>
                </Pressable>
              </View>
              <View style={ss.recentList}>
                {recentSearches.slice(0, 6).map((s, i) => (
                  <RecentRow
                    key={s}
                    label={s}
                    index={i}
                    onPress={() => handleChip(s)}
                    onRemove={() => removeRecentSearch(s)}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Trending */}
          <Animated.View entering={FadeIn.delay(60).duration(300)}>
            <View style={ss.sectionHeader}>
              <Text style={[ss.sectionTitle, { color: colors.foreground }]}>Trending now</Text>
              <View style={[ss.flamePill, { backgroundColor: "#FF6B3518" }]}>
                <Ionicons name="flame" size={13} color="#FF6B35" />
                <Text style={[ss.flameTxt, { color: "#FF6B35" }]}>Hot</Text>
              </View>
            </View>
            <View style={ss.chipsGrid}>
              {TRENDING_SEARCHES.map((label, i) => (
                <TrendingChip key={label} label={label} index={i} onPress={() => handleChip(label)} />
              ))}
            </View>
          </Animated.View>

          {/* Category Grid */}
          <Animated.View entering={FadeIn.delay(120).duration(300)}>
            <View style={ss.sectionHeader}>
              <Text style={[ss.sectionTitle, { color: colors.foreground }]}>Browse by category</Text>
            </View>
            <View style={ss.categoryGrid}>
              {QUICK_CATEGORIES.map((cat, i) => (
                <Animated.View
                  key={cat.id}
                  entering={FadeIn.delay(i * 50 + 120).duration(300)}
                  style={ss.categoryCol}
                >
                  <Pressable
                    onPress={() => handleChip(cat.label)}
                    style={({ pressed }) => [
                      ss.categoryCard,
                      {
                        backgroundColor: pressed ? cat.color + "25" : cat.color + "12",
                        borderColor: cat.color + "35",
                      },
                    ]}
                  >
                    <View style={[ss.categoryIconWrap, { backgroundColor: cat.color + "20" }]}>
                      <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                    </View>
                    <Text style={[ss.categoryLabel, { color: colors.foreground }]} numberOfLines={1}>
                      {cat.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Chichewa Tip */}
          <Animated.View entering={FadeIn.delay(200).duration(300)} style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <View style={[ss.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[ss.tipIconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="language-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ss.tipTitle, { color: colors.foreground }]}>Search in Chichewa</Text>
                <Text style={[ss.tipBody, { color: colors.mutedForeground }]}>
                  "nsapato" for shoes · "foni" for phones · "chakudya" for food
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  screen:      { flex: 1 },
  header:      { paddingHorizontal: 20, paddingBottom: 12 },
  titleRow:    { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  screenTitle: { fontSize: 28, fontFamily: "Inter_800ExtraBold", lineHeight: 32 },
  screenSub:   { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 3 },
  locationPill:{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  locationTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  searchRow:   { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBar:   { flex: 1, flexDirection: "row", alignItems: "center", height: 52, borderRadius: 16, paddingHorizontal: 14, gap: 10, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: "100%", paddingVertical: 0 },
  cancelBtn:   { paddingHorizontal: 8, paddingVertical: 10 },
  cancelText:  { fontSize: 15, fontFamily: "Inter_700Bold" },

  homeContent: { paddingTop: 4, gap: 4 },

  sectionHeader:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  clearBtn:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  clearTxt:     { fontSize: 12, fontFamily: "Inter_500Medium" },
  flamePill:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  flameTxt:     { fontSize: 12, fontFamily: "Inter_700Bold" },

  // Recent rows
  recentList:  { paddingHorizontal: 20, gap: 8 },
  recentRow:   { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 12, gap: 12 },
  recentIconWrap:{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  recentText:  { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  removeBtn:   { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  // Trending chips
  chipsGrid:   { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 8 },
  chip:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipText:    { fontSize: 13, fontFamily: "Inter_500Medium" },

  // Category grid
  categoryGrid:{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 10 },
  categoryCol: { width: "30%", flexGrow: 1 },
  categoryCard:{ alignItems: "center", justifyContent: "center", paddingVertical: 18, paddingHorizontal: 8, borderRadius: 20, borderWidth: 1, gap: 10 },
  categoryIconWrap:{ width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  categoryLabel:{ fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },

  // Tip card
  tipCard:     { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 20, borderWidth: 1, padding: 16 },
  tipIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  tipTitle:    { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 3 },
  tipBody:     { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  // Intent banner
  intentBanner:{ flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginVertical: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, gap: 10 },
  intentIcon:  { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  intentText:  { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },

  // Result count
  resultCountRow:{ flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 12, paddingTop: 4 },
  resultCountNum:{ fontSize: 22, fontFamily: "Inter_800ExtraBold" },
  resultCountLabel:{ fontSize: 14, fontFamily: "Inter_400Regular" },

  // Empty state
  emptyWrap:   { alignItems: "center", paddingTop: 60, paddingHorizontal: 40, gap: 14 },
  emptyIconBg: { width: 96, height: 96, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 4 },
  emptySub:    { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  emptyTip:    { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  emptyTipTxt: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
});
