import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  shimmer,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  shimmer: Animated.Value;
}) {
  const colors = useColors();

  const backgroundColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.muted, colors.border],
  });

  return (
    <Animated.View
      style={{
        width: width as number,
        height,
        borderRadius,
        backgroundColor,
      }}
    />
  );
}

function SingleSkeleton({ shimmer }: { shimmer: Animated.Value }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonBox width={56} height={56} borderRadius={12} shimmer={shimmer} />
      <View style={styles.content}>
        <SkeletonBox width="70%" height={14} borderRadius={6} shimmer={shimmer} />
        <View style={{ height: 6 }} />
        <SkeletonBox width="45%" height={11} borderRadius={5} shimmer={shimmer} />
        <View style={{ height: 8 }} />
        <SkeletonBox width="30%" height={10} borderRadius={5} shimmer={shimmer} />
      </View>
      <View style={styles.right}>
        <SkeletonBox width={52} height={20} borderRadius={8} shimmer={shimmer} />
      </View>
    </View>
  );
}

export function SearchSkeletonList({ count = 5 }: { count?: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 700,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [shimmer]);

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SingleSkeleton key={i} shimmer={shimmer} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  content: {
    flex: 1,
  },
  right: {
    alignItems: "flex-end",
  },
});
