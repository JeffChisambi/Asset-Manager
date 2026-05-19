import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { memo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Post } from "@/types/profile";
import { useColors } from "@/hooks/useColors";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

interface ActionButtonProps {
  icon: string;
  count?: number;
  active?: boolean;
  activeColor?: string;
  onPress: () => void;
}

const ActionButton = memo(
  ({ icon, count, active, activeColor, onPress }: ActionButtonProps) => {
    const colors = useColors();
    const scale = useSharedValue(1);
    const color = active ? activeColor ?? colors.primary : colors.mutedForeground;

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => (scale.value = withSpring(0.82, { damping: 8 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 8 }))}
        style={styles.actionBtn}
      >
        <Animated.View style={[styles.actionInner, animStyle]}>
          <Ionicons name={icon as any} size={19} color={color} />
          {count !== undefined && (
            <Text style={[styles.actionCount, { color }]}>
              {formatCount(count)}
            </Text>
          )}
        </Animated.View>
      </Pressable>
    );
  }
);

interface ProfilePostCardProps {
  post: Post;
}

export const ProfilePostCard = memo(({ post }: ProfilePostCardProps) => {
  const colors = useColors();
  const [liked, setLiked] = useState(post.isLiked);
  const [saved, setSaved] = useState(post.isSaved);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    setSaved((s) => !s);
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.content, { color: colors.foreground }]}>
        {post.content}
      </Text>

      {post.productTag && (
        <View
          style={[
            styles.productTag,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
          <Text style={[styles.productTagText, { color: colors.primary }]}>
            {post.productTag.brand} · {post.productTag.name} ·{" "}
            <Text style={styles.productTagPrice}>
              ${post.productTag.price.toFixed(2)}
            </Text>
          </Text>
        </View>
      )}

      {post.tags.length > 0 && (
        <View style={styles.tags}>
          {post.tags.map((tag) => (
            <Text
              key={tag}
              style={[styles.tag, { color: colors.primary }]}
            >
              #{tag}
            </Text>
          ))}
        </View>
      )}

      <View
        style={[styles.separator, { backgroundColor: colors.border }]}
      />

      <View style={styles.actions}>
        <ActionButton
          icon={liked ? "heart" : "heart-outline"}
          count={likeCount}
          active={liked}
          activeColor="#EF4444"
          onPress={handleLike}
        />
        <ActionButton
          icon="chatbubble-outline"
          count={post.comments}
          onPress={() => {}}
        />
        <ActionButton
          icon="arrow-redo-outline"
          count={post.shares}
          onPress={() => {}}
        />
        <View style={styles.spacer} />
        <ActionButton
          icon={saved ? "bookmark" : "bookmark-outline"}
          active={saved}
          onPress={handleSave}
        />
      </View>

      <Text style={[styles.time, { color: colors.mutedForeground }]}>
        {post.createdAt}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  content: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 12,
  },
  productTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  productTagText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  productTagPrice: {
    fontFamily: "Inter_800ExtraBold",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  tag: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  separator: {
    height: 1,
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  actionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  spacer: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 12,
  },
});
