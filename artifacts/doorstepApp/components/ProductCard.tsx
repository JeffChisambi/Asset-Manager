import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// Shop type badge colours
const SHOP_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "Super Store": { bg: "#13B734", text: "#FFFFFF" },
  "Basic Store": { bg: "#11998E", text: "#FFFFFF" },
  "Vendor":      { bg: "#F7971E", text: "#FFFFFF" },
};

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  brand: string;
  image: ImageSourcePropType;
  shopType?: "Super Store" | "Basic Store" | "Vendor";
  shopName?: string;
  availableItems?: number;
  onPress?: () => void;
}

export function ProductCard({
  name,
  price,
  image,
  shopType = "Basic Store",
  shopName,
  availableItems,
  onPress,
}: ProductCardProps) {
  const colors = useColors();
  const [liked, setLiked] = useState(false);
  const heartScale = useSharedValue(1);
  const cardScale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handleLike = () => {
    setLiked((prev) => !prev);
    heartScale.value = withSpring(1.4, { damping: 6 }, () => {
      heartScale.value = withSpring(1);
    });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressIn = () => {
    cardScale.value = withTiming(0.97, { duration: 100 });
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1);
  };

  const badgeColors = SHOP_TYPE_COLORS[shopType] ?? SHOP_TYPE_COLORS["Basic Store"];

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            width: CARD_WIDTH,
          },
        ]}
      >
        {/* ── Product Image ── */}
        <View style={[styles.imageContainer, { backgroundColor: colors.secondary }]}>
          {/* Heart */}
          <Pressable onPress={handleLike} style={styles.heartBtn} hitSlop={8}>
            <Animated.View style={heartStyle}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={18}
                color={liked ? "#EF4444" : colors.mutedForeground}
              />
            </Animated.View>
          </Pressable>

          {/* Shop type badge */}
          <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
            <Text style={[styles.badgeText, { color: badgeColors.text }]}>
              {shopType}
            </Text>
          </View>

          <Image source={image} style={styles.image} resizeMode="contain" />
        </View>

        {/* ── Info ── */}
        <View style={[styles.info, { borderTopColor: colors.border }]}>
          {/* Shop name row */}
          {shopName && (
            <View style={styles.shopRow}>
              <Ionicons name="storefront-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.shopName, { color: colors.mutedForeground }]} numberOfLines={1}>
                {shopName}
              </Text>
            </View>
          )}

          {/* Product name */}
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {name}
          </Text>

          {/* Price + available items */}
          <View style={styles.bottomRow}>
            <Text style={[styles.price, { color: colors.primary }]}>
              MWK {price.toFixed(2)}
            </Text>
            {availableItems !== undefined && (
              <View style={[styles.stockPill, { backgroundColor: colors.muted }]}>
                <Text style={[styles.stockText, { color: colors.mutedForeground }]}>
                  {availableItems} left
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    marginBottom: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  imageContainer: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 140,
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  image: {
    width: "85%",
    height: "85%",
  },
  info: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  shopName: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 17,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  stockPill: {
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  stockText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});
