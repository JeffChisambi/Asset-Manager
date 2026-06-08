import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/chat/UserAvatar";

interface MessageBubbleProps {
  text: string;
  isMine: boolean;
  senderName?: string;
  senderColor?: string;
  senderDisplayName?: string;
  senderAvatarUrl?: string;
  timestamp: number;
  showSender?: boolean;
  showAvatar?: boolean;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function MessageBubble({
  text,
  isMine,
  senderName,
  senderColor,
  senderDisplayName,
  senderAvatarUrl,
  timestamp,
  showSender,
  showAvatar,
}: MessageBubbleProps) {
  const colors = useColors();

  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      {/* Avatar for received messages — left side */}
      {!isMine && (
        <View style={styles.avatarSlot}>
          {showAvatar !== false ? (
            <UserAvatar
              displayName={senderDisplayName ?? senderName ?? "?"}
              avatarColor={senderColor ?? colors.primary}
              avatarUrl={senderAvatarUrl}
              size={28}
            />
          ) : (
            <View style={{ width: 28 }} />
          )}
        </View>
      )}

      <View style={styles.bubbleColumn}>
        {/* Sender name in group chats */}
        {showSender && senderName && !isMine && (
          <Text style={[styles.senderName, { color: senderColor ?? colors.primary }]}>
            {senderName}
          </Text>
        )}

        <View
          style={[
            styles.bubble,
            isMine
              ? [styles.bubbleMine, { backgroundColor: colors.primary }]
              : [styles.bubbleOther, { backgroundColor: colors.muted }],
          ]}
        >
          <Text
            style={[
              styles.text,
              { color: isMine ? "#FFFFFF" : colors.foreground },
            ]}
          >
            {text}
          </Text>
          <Text
            style={[
              styles.time,
              { color: isMine ? "rgba(255,255,255,0.65)" : colors.mutedForeground },
            ]}
          >
            {formatTime(timestamp)}
          </Text>
        </View>
      </View>

      {/* Spacer on right side for received messages to keep bubble from stretching too far */}
      {!isMine && <View style={styles.rightSpacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 2,
    paddingHorizontal: 10,
  },
  rowRight: {
    justifyContent: "flex-end",
  },
  rowLeft: {
    justifyContent: "flex-start",
  },
  avatarSlot: {
    marginRight: 6,
    marginBottom: 2,
  },
  rightSpacer: {
    width: 40,
  },
  bubbleColumn: {
    maxWidth: "72%",
    flexShrink: 1,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 2,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
    marginLeft: 4,
  },
  text: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    alignSelf: "flex-end",
  },
});
