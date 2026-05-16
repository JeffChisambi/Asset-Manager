import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface MessageBubbleProps {
  text: string;
  isMine: boolean;
  senderName?: string;
  senderColor?: string;
  timestamp: number;
  showSender?: boolean;
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
  timestamp,
  showSender,
}: MessageBubbleProps) {
  const colors = useColors();

  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isMine
            ? [styles.bubbleMine, { backgroundColor: colors.primary }]
            : [styles.bubbleOther, { backgroundColor: colors.muted, borderColor: colors.border }],
        ]}
      >
        {showSender && senderName && !isMine && (
          <Text
            style={[styles.senderName, { color: senderColor ?? colors.primary }]}
          >
            {senderName}
          </Text>
        )}
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
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  rowRight: {
    alignItems: "flex-end",
  },
  rowLeft: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
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
    borderWidth: 1,
  },
  senderName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
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
