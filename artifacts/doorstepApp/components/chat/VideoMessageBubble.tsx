import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

interface VideoMessageBubbleProps {
  videoUri: string;
  isMine: boolean;
  timestamp: number;
  status?: "sending" | "sent" | "failed";
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function VideoMessageBubble({
  videoUri,
  isMine,
  timestamp,
  status,
}: VideoMessageBubbleProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const previewPlayer = useVideoPlayer(videoUri, (player) => {
    player.muted = true;
    player.loop = true;
  });

  const fullPlayer = useVideoPlayer(videoUri, (player) => {
    player.loop = true;
    if (expanded) {
      player.play();
    } else {
      player.pause();
    }
  });

  return (
    <>
      <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
        <Pressable
          onPress={() => status !== "sending" && setExpanded(true)}
          style={[
            styles.bubble,
            isMine
              ? { borderBottomRightRadius: 4, backgroundColor: colors.primary }
              : {
                  borderBottomLeftRadius: 4,
                  borderColor: colors.border,
                  borderWidth: 1,
                  backgroundColor: colors.muted,
                },
          ]}
        >
          <View style={styles.previewWrap}>
            <VideoView
              player={previewPlayer}
              style={styles.video}
              nativeControls={false}
              contentFit="cover"
            />
            <View style={styles.playOverlay}>
              {status === "sending" ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="play" size={24} color="#FFF" />
              )}
            </View>
          </View>
          <Text
            style={[
              styles.time,
              {
                color: isMine
                  ? "rgba(255,255,255,0.7)"
                  : colors.mutedForeground,
              },
            ]}
          >
            {formatTime(timestamp)}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <SafeAreaView style={styles.modalBg}>
          <Pressable onPress={() => setExpanded(false)} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
          <VideoView
            player={fullPlayer}
            style={styles.fullVideo}
            contentFit="contain"
            nativeControls={true}
          />
        </SafeAreaView>
      </Modal>
    </>
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
    overflow: "hidden",
    maxWidth: width * 0.65,
  },
  previewWrap: { position: "relative" },
  video: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 14,
    backgroundColor: "#111",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 14,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 4,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullVideo: {
    width,
    height: width * 1.2,
  },
});
