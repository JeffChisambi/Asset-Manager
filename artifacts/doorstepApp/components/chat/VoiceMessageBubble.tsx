import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface VoiceMessageBubbleProps {
  audioUri: string;
  audioDuration: number;
  isMine: boolean;
  timestamp: number;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const BAR_COUNT = 28;
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) =>
  Math.max(4, Math.round(8 + Math.sin(i * 1.3) * 6 + Math.cos(i * 0.7) * 4)),
);

export function VoiceMessageBubble({
  audioUri,
  audioDuration,
  isMine,
  timestamp,
}: VoiceMessageBubbleProps) {
  const colors = useColors();
  const player = useAudioPlayer(audioUri);

  const isPlaying = player?.playing ?? false;
  const elapsed = player?.currentTime ?? 0;
  const progress = Math.min(elapsed / Math.max(audioDuration, 1), 1);

  const togglePlay = () => {
    if (Platform.OS === "web" || !player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const bgColor = isMine ? colors.primary : colors.muted;
  const fgColor = isMine ? "#FFFFFF" : colors.foreground;
  const mutedFg = isMine ? "rgba(255,255,255,0.6)" : colors.mutedForeground;
  const activeBar = isMine ? "rgba(255,255,255,0.9)" : colors.primary;
  const inactiveBar = isMine ? "rgba(255,255,255,0.35)" : colors.border;

  const displayDuration = isPlaying ? elapsed : audioDuration;

  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: bgColor },
          isMine ? styles.bubbleMine : styles.bubbleOther,
          !isMine && { borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <View style={styles.content}>
          <Pressable
            onPress={togglePlay}
            style={[
              styles.playBtn,
              {
                backgroundColor: isMine
                  ? "rgba(255,255,255,0.25)"
                  : colors.primary + "20",
              },
            ]}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={18}
              color={isMine ? "#FFF" : colors.primary}
            />
          </Pressable>

          <View style={styles.waveform}>
            {BAR_HEIGHTS.map((h, i) => {
              const filled = i / BAR_COUNT <= progress;
              return (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor: filled ? activeBar : inactiveBar,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.duration, { color: mutedFg }]}>
            {formatDuration(displayDuration)}
          </Text>
          <Text style={[styles.time, { color: mutedFg }]}>
            {formatTime(timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    marginVertical: 2,
    paddingHorizontal: 10,
  },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: "82%",
    minWidth: 220,
    gap: 6,
  },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  waveform: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 28,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  duration: { fontSize: 11, fontFamily: "Inter_500Medium" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
