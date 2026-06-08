import React from "react";
import { View, Text, StyleSheet, Pressable, Image, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { SearchResult } from "@/hooks/useSearch";
import { HighlightText } from "./HighlightText";
import { useColors } from "@/hooks/useColors";

interface Props {
  result: SearchResult;
  query: string;
  onPress?: () => void;
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<SearchResult["type"], { label: string; color: string; icon: string; lib: "ion" | "mci" }> = {
  product:      { label: "Product",      color: "#FF6B35", icon: "cube-outline",        lib: "ion" },
  store:        { label: "Store",        color: "#13B734", icon: "storefront-outline",  lib: "mci" },
  professional: { label: "Pro",          color: "#667EEA", icon: "person-circle-outline", lib: "ion" },
  service:      { label: "Service",      color: "#11998E", icon: "construct-outline",   lib: "ion" },
  category:     { label: "Category",    color: "#F7971E", icon: "grid-outline",         lib: "ion" },
};

function TypeBadge({ type }: { type: SearchResult["type"] }) {
  const c = TYPE_CONFIG[type];
  const IconComp = c.lib === "mci" ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={[bd.badge, { backgroundColor: c.color + "18", borderColor: c.color + "35" }]}>
      <IconComp name={c.icon as any} size={11} color={c.color} />
      <Text style={[bd.badgeTxt, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}
const bd = StyleSheet.create({
  badge:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  badgeTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

// ─── Card ─────────────────────────────────────────────────────────────────────
export function SearchResultCard({ result, query, onPress }: Props) {
  const colors = useColors();

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) { onPress(); return; }
    if (result.route) router.push(result.route as any);
  };

  const showPrice = result.price !== undefined &&
    (result.type === "product" || result.type === "service" || result.type === "professional");

  const accentColor = result.accentColor ?? colors.primary;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        ss.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {/* Thumbnail */}
      <View style={[ss.thumb, { backgroundColor: accentColor + "18" }]}>
        {result.imageUrl ? (
          <Image source={{ uri: result.imageUrl }} style={ss.thumbImg} resizeMode="cover" />
        ) : (
          <View style={[ss.thumbPlaceholder, { backgroundColor: accentColor + "25" }]}>
            <Ionicons name="image-outline" size={24} color={accentColor} />
          </View>
        )}
        {result.isVerified && (
          <View style={[ss.verifiedBadge, { backgroundColor: colors.card }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={ss.info}>
        {/* Top row: type badge + open/closed */}
        <View style={ss.topRow}>
          <TypeBadge type={result.type} />
          {result.openNow !== undefined && (
            <View style={[ss.openBadge, { backgroundColor: result.openNow ? "#10B98118" : colors.muted }]}>
              <View style={[ss.openDot, { backgroundColor: result.openNow ? "#10B981" : colors.mutedForeground }]} />
              <Text style={[ss.openTxt, { color: result.openNow ? "#10B981" : colors.mutedForeground }]}>
                {result.openNow ? "Open" : "Closed"}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <HighlightText
          text={result.title}
          query={query}
          style={[ss.title, { color: colors.foreground }]}
          numberOfLines={1}
        />

        {/* Subtitle */}
        <Text style={[ss.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
          {result.subtitle}
        </Text>

        {/* Bottom meta row */}
        <View style={ss.metaRow}>
          {!!result.rating && (
            <View style={ss.ratingRow}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[ss.ratingTxt, { color: colors.foreground }]}>{result.rating.toFixed(1)}</Text>
              {result.reviewCount > 0 && (
                <Text style={[ss.reviewTxt, { color: colors.mutedForeground }]}>
                  ({result.reviewCount > 999 ? (result.reviewCount / 1000).toFixed(1) + "k" : result.reviewCount})
                </Text>
              )}
            </View>
          )}
          {result.location && (
            <View style={ss.locRow}>
              <Ionicons name="location-outline" size={11} color={colors.mutedForeground} />
              <Text style={[ss.locTxt, { color: colors.mutedForeground }]} numberOfLines={1}>
                {result.distance !== undefined
                  ? result.distance < 1
                    ? `${(result.distance * 1000).toFixed(0)}m`
                    : `${result.distance.toFixed(1)}km`
                  : result.location}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Right column */}
      <View style={ss.right}>
        {showPrice && result.price !== undefined && (
          <Text style={[ss.price, { color: colors.primary }]}>${result.price}</Text>
        )}
        {result.badge && (
          <View style={[ss.resultBadge, { backgroundColor: accentColor + "15" }]}>
            <Text style={[ss.resultBadgeTxt, { color: accentColor }]} numberOfLines={1}>
              {result.badge}
            </Text>
          </View>
        )}
        <View style={[ss.chevronWrap, { backgroundColor: colors.muted }]}>
          <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

const ss = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  thumbImg:         { width: "100%", height: "100%" },
  thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  verifiedBadge: {
    position: "absolute", bottom: -3, right: -3,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 3,
  },
  info:     { flex: 1, gap: 4 },
  topRow:   { flexDirection: "row", alignItems: "center", gap: 6 },
  openBadge:{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  openDot:  { width: 5, height: 5, borderRadius: 3 },
  openTxt:  { fontSize: 11, fontFamily: "Inter_500Medium" },
  title:    { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 19 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  metaRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  ratingRow:{ flexDirection: "row", alignItems: "center", gap: 3 },
  ratingTxt:{ fontSize: 12, fontFamily: "Inter_600SemiBold" },
  reviewTxt:{ fontSize: 11, fontFamily: "Inter_400Regular" },
  locRow:   { flexDirection: "row", alignItems: "center", gap: 3, flex: 1 },
  locTxt:   { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  right:    { alignItems: "flex-end", gap: 6, minWidth: 52 },
  price:    { fontSize: 16, fontFamily: "Inter_800ExtraBold" },
  resultBadge:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  resultBadgeTxt:{ fontSize: 10, fontFamily: "Inter_600SemiBold" },
  chevronWrap:   { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
