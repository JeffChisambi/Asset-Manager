import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UserAvatar } from "@/components/chat/UserAvatar";
import { useColors } from "@/hooks/useColors";

interface ConversationRowProps {
  name: string;
  avatarColor: string;
  lastMessage?: string;
  lastTime?: number;
  isGroup?: boolean;
  memberCount?: number;
  onPress: () => void;
}

function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ConversationRow({
  name,
  avatarColor,
  lastMessage,
  lastTime,
  isGroup,
  memberCount,
  onPress,
}: ConversationRowProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.muted : colors.background },
      ]}
    >
      <View style={styles.avatarWrap}>
        <UserAvatar displayName={name} avatarColor={avatarColor} size={52} />
        {isGroup && (
          <View style={[styles.groupBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.groupBadgeText}>G</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {lastTime && (
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {formatRelativeTime(lastTime)}
            </Text>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.lastMsg, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {lastMessage ??
              (isGroup
                ? `${memberCount} members`
                : "Tap to start chatting")}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
  },
  groupBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  groupBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginLeft: 8,
  },
  lastMsg: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
