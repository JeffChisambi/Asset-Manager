import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View, ActivityIndicator, Linking, Pressable } from "react-native";

import { useColors } from "@/hooks/useColors";

interface FileMessageBubbleProps {
  fileUri?: string;
  fileName: string;
  fileSize?: number;
  fileMimeType?: string;
  isMine: boolean;
  timestamp: number;
  status?: "sending" | "sent" | "failed";
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function getFileIcon(mimeType?: string, fileName?: string): "document-text" | "image" | "musical-notes" | "videocam" | "document" {
  const mime = mimeType ?? "";
  const name = fileName?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/.test(name)) return "image";
  if (mime.startsWith("audio/") || /\.(mp3|wav|m4a|ogg)$/.test(name)) return "musical-notes";
  if (mime.startsWith("video/") || /\.(mp4|mov|avi|mkv)$/.test(name)) return "videocam";
  if (mime.includes("pdf") || /\.pdf$/.test(name)) return "document-text";
  return "document";
}

export function FileMessageBubble({
  fileUri,
  fileName,
  fileSize,
  fileMimeType,
  isMine,
  timestamp,
  status,
}: FileMessageBubbleProps) {
  const colors = useColors();
  const icon = getFileIcon(fileMimeType, fileName);
  const bgColor = isMine ? colors.primary : colors.muted;
  const fgColor = isMine ? "#FFFFFF" : colors.foreground;
  const mutedFg = isMine ? "rgba(255,255,255,0.65)" : colors.mutedForeground;
  const iconBg = isMine ? "rgba(255,255,255,0.2)" : colors.primary + "18";
  const iconColor = isMine ? "#FFF" : colors.primary;
  const canOpen = !!fileUri && status !== "sending";

  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      <Pressable
        disabled={!canOpen}
        onPress={() => {
          if (fileUri) Linking.openURL(fileUri).catch(() => {});
        }}
        style={[
          styles.bubble,
          { backgroundColor: bgColor },
          isMine ? styles.bubbleMine : styles.bubbleOther,
          !isMine && { borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <View style={styles.content}>
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            {status === "sending" ? (
              <ActivityIndicator color={iconColor} size="small" />
            ) : (
              <Ionicons name={icon} size={22} color={iconColor} />
            )}
          </View>
          <View style={styles.fileInfo}>
            <Text
              style={[styles.fileName, { color: fgColor }]}
              numberOfLines={2}
            >
              {fileName}
            </Text>
            {!!fileSize && (
              <Text style={[styles.fileSize, { color: mutedFg }]}>
                {formatSize(fileSize)}
              </Text>
            )}
          </View>
        </View>
        <Text style={[styles.time, { color: mutedFg }]}>
          {formatTime(timestamp)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { 
    width: "100%",
    flexDirection: "row",
    marginVertical: 2, 
    paddingHorizontal: 10 
  },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: "78%",
    minWidth: 200,
    gap: 6,
  },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fileInfo: { flex: 1, gap: 2 },
  fileName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  fileSize: { fontSize: 11, fontFamily: "Inter_400Regular" },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    alignSelf: "flex-end",
  },
});
