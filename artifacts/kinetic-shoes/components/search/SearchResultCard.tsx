import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

function EntityTypeBadge({ type }: { type: SearchResult["type"] }) {
  const colors = useColors();

  const config: Record<
    SearchResult["type"],
    { label: string; color: string; icon: React.ReactNode }
  > = {
    product: {
      label: "Product",
      color: "#FF6B35",
      icon: <Feather name="box" size={10} color="#FF6B35" />,
    },
    store: {
      label: "Store",
      color: colors.primary,
      icon: <MaterialCommunityIcons name="storefront-outline" size={10} color={colors.primary} />,
    },
    professional: {
      label: "Pro",
      color: "#667EEA",
      icon: <Ionicons name="person-outline" size={10} color="#667EEA" />,
    },
    service: {
      label: "Service",
      color: "#11998E",
      icon: <Feather name="tool" size={10} color="#11998E" />,
    },
    category: {
      label: "Category",
      color: "#F7971E",
      icon: <Ionicons name="grid-outline" size={10} color="#F7971E" />,
    },
  };

  const c = config[type];
  return (
    <View style={[styles.typeBadge, { backgroundColor: c.color + "18", borderColor: c.color + "40" }]}>
      {c.icon}
      <Text style={[styles.typeBadgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

function StarRating({ rating }: { rating: number }) {
  const colors = useColors();
  if (!rating) return null;
  return (
    <View style={styles.ratingRow}>
      <Ionicons name="star" size={11} color="#F59E0B" />
      <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

export function SearchResultCard({ result, query, onPress }: Props) {
  const colors = useColors();

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPress) {
      onPress();
      return;
    }
    if (result.route) {
      router.push(result.route as any);
    }
  };

  const showPrice =
    result.price !== undefined &&
    (result.type === "product" || result.type === "service" || result.type === "professional");

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      {/* Thumbnail */}
      <View style={[styles.thumb, { backgroundColor: result.accentColor + "20" }]}>
        {result.imageUrl ? (
          <Image
            source={{ uri: result.imageUrl }}
            style={styles.thumbImg}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: result.accentColor + "30" }]}>
            <Feather name="image" size={22} color={result.accentColor ?? colors.mutedForeground} />
          </View>
        )}

        {result.isVerified && (
          <View style={styles.verifiedDot}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          <EntityTypeBadge type={result.type} />
          {result.openNow !== undefined && (
            <View style={[styles.openBadge, { backgroundColor: result.openNow ? "#10B98120" : colors.muted }]}>
              <Text style={[styles.openText, { color: result.openNow ? "#10B981" : colors.mutedForeground }]}>
                {result.openNow ? "Open" : "Closed"}
              </Text>
            </View>
          )}
        </View>

        <HighlightText
          text={result.title}
          query={query}
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={1}
        />

        <Text
          style={[styles.subtitle, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {result.subtitle}
        </Text>

        <View style={styles.bottomRow}>
          <StarRating rating={result.rating} />
          {result.reviewCount > 0 && (
            <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>
              ({result.reviewCount > 999
                ? (result.reviewCount / 1000).toFixed(1) + "k"
                : result.reviewCount})
            </Text>
          )}
          {result.location && (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={10} color={colors.mutedForeground} />
              <Text style={[styles.locationText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {result.distance !== undefined
                  ? `${result.distance < 1 ? (result.distance * 1000).toFixed(0) + "m" : result.distance.toFixed(1) + "km"}`
                  : result.location}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Right side */}
      <View style={styles.right}>
        {showPrice && result.price !== undefined && (
          <Text style={[styles.price, { color: colors.primary }]}>
            ${result.price}
          </Text>
        )}
        {result.badge && (
          <Text style={[styles.badge, { color: colors.mutedForeground }]} numberOfLines={1}>
            {result.badge}
          </Text>
        )}
        <Feather name="chevron-right" size={16} color={colors.border} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 16,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "white",
    borderRadius: 8,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  openBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  openText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  reviewCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flex: 1,
  },
  locationText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 50,
  },
  price: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  badge: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },
});
