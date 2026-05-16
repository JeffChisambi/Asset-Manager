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

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  brand: string;
  image: ImageSourcePropType;
  onPress?: () => void;
}

export function ProductCard({ name, price, image, onPress }: ProductCardProps) {
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

  return (
    <Animated.View style={[cardStyle]}>
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
        <View style={styles.imageContainer}>
          <Pressable onPress={handleLike} style={styles.heartBtn} hitSlop={8}>
            <Animated.View style={heartStyle}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={20}
                color={liked ? "#EF4444" : colors.mutedForeground}
              />
            </Animated.View>
          </Pressable>
          <Image source={image} style={styles.image} resizeMode="contain" />
        </View>
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={[styles.price, { color: colors.foreground }]}>
            ${price.toFixed(2)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  imageContainer: {
    backgroundColor: "#F8F9FF",
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 150,
  },
  heartBtn: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 10,
  },
  image: {
    width: "90%",
    height: "90%",
  },
  info: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  price: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
