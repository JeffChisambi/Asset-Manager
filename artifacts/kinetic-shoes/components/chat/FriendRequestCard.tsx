import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UserAvatar } from "@/components/chat/UserAvatar";
import { type AppUser } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

interface FriendRequestCardProps {
  user: AppUser;
  type: "received" | "sent";
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}

export function FriendRequestCard({
  user,
  type,
  onAccept,
  onReject,
  onCancel,
}: FriendRequestCardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <UserAvatar
        displayName={user.displayName}
        avatarColor={user.avatarColor}
        size={48}
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {user.displayName}
        </Text>
        <Text style={[styles.username, { color: colors.mutedForeground }]}>
          @{user.username}
        </Text>
      </View>
      {type === "received" && (
        <View style={styles.actions}>
          <Pressable
            onPress={onAccept}
            style={[styles.btn, styles.acceptBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </Pressable>
          <Pressable
            onPress={onReject}
            style={[styles.btn, styles.rejectBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.rejectText, { color: colors.mutedForeground }]}>
              Decline
            </Text>
          </Pressable>
        </View>
      )}
      {type === "sent" && (
        <Pressable
          onPress={onCancel}
          style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.rejectText, { color: colors.mutedForeground }]}>
            Cancel
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  username: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "column",
    gap: 6,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {},
  rejectBtn: {
    borderWidth: 1,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  acceptText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  rejectText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
