import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import { UserAvatar } from "@/components/chat/UserAvatar";
import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function VideoCallScreen() {
  const { convId } = useLocalSearchParams<{ convId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, getConversation, getUser } = useChat();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const conv = getConversation(convId ?? "");
  const otherId = conv?.memberIds.find((id) => id !== currentUser?.id);
  const otherUser = getUser(otherId ?? "");

  const [status, setStatus] = useState<"calling" | "connected" | "ended">("calling");
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [showControls, setShowControls] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") requestCameraPermission();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setStatus("connected"), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const resetControlsTimer = () => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setShowControls(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    controlsTimer.current = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() =>
        setShowControls(false)
      );
    }, 4000);
  };

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, []);

  const handleEnd = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setStatus("ended");
    setTimeout(() => router.back(), 600);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const remoteAvatarColor = conv?.type === "group" ? colors.primary : (otherUser?.avatarColor ?? colors.primary);
  const remoteName = conv?.type === "group" ? (conv.name ?? "Group") : (otherUser?.displayName ?? "Unknown");

  return (
    <Pressable style={styles.root} onPress={resetControlsTimer}>
      {/* Remote "video" — simulated with gradient + avatar */}
      <View style={[styles.remoteVideo, { backgroundColor: remoteAvatarColor + "33" }]}>
        <View style={[styles.remoteBg, { backgroundColor: "#0D0D1A" }]} />
        <View style={styles.remoteContent}>
          <UserAvatar
            displayName={remoteName}
            avatarColor={remoteAvatarColor}
            size={status === "connected" ? 90 : 100}
          />
          {status === "calling" && (
            <Text style={styles.remoteStatus}>Calling…</Text>
          )}
          {status === "connected" && (
            <Text style={styles.remoteTimer}>{formatDuration(duration)}</Text>
          )}
        </View>
      </View>

      {/* Local camera preview */}
      {!videoOff && Platform.OS !== "web" && cameraPermission?.granted ? (
        <View style={[styles.localVideo, { bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }]}>
          <CameraView style={StyleSheet.absoluteFill} facing={facing} />
        </View>
      ) : (
        <View style={[styles.localVideo, styles.localVideoOff, { backgroundColor: "#222", bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }]}>
          <Ionicons name="videocam-off" size={22} color="rgba(255,255,255,0.5)" />
        </View>
      )}

      {/* Top bar */}
      <Animated.View
        style={[styles.topBar, { paddingTop: topPad + 4, opacity: fadeAnim }]}
        pointerEvents={showControls ? "auto" : "none"}
      >
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="chevron-down" size={26} color="#FFF" />
        </Pressable>
        <View style={styles.topCenter}>
          <Ionicons name="videocam" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.topLabel}>Video Call</Text>
        </View>
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* Bottom controls */}
      <Animated.View
        style={[
          styles.controls,
          {
            paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 24,
            opacity: fadeAnim,
          },
        ]}
        pointerEvents={showControls ? "auto" : "none"}
      >
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.controlRow}>
          <View style={styles.controlItem}>
            <Pressable
              onPress={() => { setMuted(!muted); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.controlBtn, muted && styles.controlBtnActive]}
            >
              <Ionicons name={muted ? "mic-off" : "mic"} size={22} color="#FFF" />
            </Pressable>
            <Text style={styles.controlLabel}>{muted ? "Unmute" : "Mute"}</Text>
          </View>

          <View style={styles.controlItem}>
            <Pressable
              onPress={() => { setVideoOff(!videoOff); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.controlBtn, videoOff && styles.controlBtnActive]}
            >
              <Ionicons name={videoOff ? "videocam-off" : "videocam"} size={22} color="#FFF" />
            </Pressable>
            <Text style={styles.controlLabel}>{videoOff ? "Start Video" : "Stop Video"}</Text>
          </View>

          <View style={styles.controlItem}>
            <Pressable
              onPress={handleEnd}
              style={[styles.controlBtn, styles.endBtn]}
            >
              <Ionicons name="call" size={24} color="#FFF" style={{ transform: [{ rotate: "135deg" }] }} />
            </Pressable>
            <Text style={styles.controlLabel}>End</Text>
          </View>

          <View style={styles.controlItem}>
            <Pressable
              onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
              style={styles.controlBtn}
            >
              <Ionicons name="camera-reverse" size={22} color="#FFF" />
            </Pressable>
            <Text style={styles.controlLabel}>Flip</Text>
          </View>

          <View style={styles.controlItem}>
            <Pressable
              onPress={resetControlsTimer}
              style={styles.controlBtn}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#FFF" />
            </Pressable>
            <Text style={styles.controlLabel}>More</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D1A" },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  remoteBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  remoteContent: {
    alignItems: "center",
    gap: 16,
    zIndex: 1,
  },
  remoteStatus: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 18,
    fontFamily: "Inter_500Medium",
  },
  remoteTimer: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  localVideo: {
    position: "absolute",
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  localVideoOff: {
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    overflow: "hidden",
  },
  topBtn: { padding: 8 },
  topCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  topLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  controlItem: { alignItems: "center", gap: 6 },
  controlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnActive: { backgroundColor: "#4A80F0" },
  endBtn: { backgroundColor: "#EF4444" },
  controlLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
