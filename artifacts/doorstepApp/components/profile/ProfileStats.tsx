import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatItemProps {
  label: string;
  value: number;
  onPress?: () => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const StatItem = memo(({ label, value, onPress }: StatItemProps) => {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={styles.stat}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.value, { color: colors.foreground }]}>
        {formatCount(value)}
      </Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

interface ProfileStatsProps {
  posts: number;
  followers: number;
  following: number;
  friends: number;
}

export const ProfileStats = memo(
  ({ posts, followers, following, friends }: ProfileStatsProps) => {
    const colors = useColors();
    return (
      <View
        style={[
          styles.container,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <StatItem label="Posts" value={posts} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatItem label="Followers" value={followers} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatItem label="Following" value={following} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatItem label="Friends" value={friends} />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    width: 2,
    height: 32,
  },
});
