import { Ionicons } from "@expo/vector-icons";
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

import { UserAvatar } from "@/components/chat/UserAvatar";
import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function VoiceCallScreen() {
  const { convId } = useLocalSearchParams<{ convId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, getConversation, getUser } = useChat();

  const conv = getConversation(convId ?? "");
  const otherId = conv?.memberIds.find((id) => id !== currentUser?.id);
  const otherUser = getUser(otherId ?? "");

  const [status, setStatus] = useState<"calling" | "connected" | "ended">("calling");
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulse2Anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(pulse2Anim, { toValue: 1.55, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse2Anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    if (status === "calling") { loop.start(); loop2.start(); }
    else { loop.stop(); loop2.stop(); pulseAnim.setValue(1); pulse2Anim.setValue(1); }
    return () => { loop.stop(); loop2.stop(); };
  }, [status, pulseAnim, pulse2Anim]);

  useEffect(() => {
    const timer = setTimeout(() => setStatus("connected"), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleEnd = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setStatus("ended");
    setTimeout(() => router.back(), 800);
  };

  const avatarSize = 100;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Back button */}
      <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: topPad + 12 }]}>
        <Ionicons name="chevron-down" size={28} color="rgba(255,255,255,0.8)" />
      </Pressable>

      <View style={styles.callType}>
        <Ionicons name="call" size={14} color="rgba(255,255,255,0.6)" />
        <Text style={styles.callTypeText}>
          {conv?.type === "group" ? "Group Voice Call" : "Voice Call"}
        </Text>
      </View>

      {/* Avatar with pulse */}
      <View style={styles.avatarSection}>
        {status === "calling" && (
          <>
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulse2Anim }], borderColor: "rgba(255,255,255,0.08)" },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                styles.pulseRing2,
                { transform: [{ scale: pulseAnim }], borderColor: "rgba(255,255,255,0.14)" },
              ]}
            />
          </>
        )}
        <View style={styles.avatarWrap}>
          <UserAvatar
            displayName={conv?.type === "group" ? (conv.name ?? "Group") : (otherUser?.displayName ?? "?")}
            avatarColor={conv?.type === "group" ? colors.primary : (otherUser?.avatarColor ?? colors.primary)}
            size={avatarSize}
          />
        </View>
        <Text style={styles.callerName}>
          {conv?.type === "group" ? (conv.name ?? "Group Chat") : (otherUser?.displayName ?? "Unknown")}
        </Text>
        {otherUser && conv?.type === "direct" && (
          <Text style={styles.callerHandle}>@{otherUser.username}</Text>
        )}
        <Text style={styles.callStatus}>
          {status === "calling" ? "Calling…" : status === "connected" ? formatDuration(duration) : "Call ended"}
        </Text>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 24 }]}>
        <View style={styles.controlRow}>
          <View style={styles.controlItem}>
            <Pressable
              onPress={() => { setMuted(!muted); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.controlBtn, muted && styles.controlBtnActive]}
            >
              <Ionicons name={muted ? "mic-off" : "mic"} size={26} color="#FFF" />
            </Pressable>
            <Text style={styles.controlLabel}>{muted ? "Unmute" : "Mute"}</Text>
          </View>

          <View style={styles.controlItem}>
            <Pressable
              onPress={handleEnd}
              style={[styles.controlBtn, styles.endBtn]}
            >
              <Ionicons name="call" size={28} color="#FFF" style={{ transform: [{ rotate: "135deg" }] }} />
            </Pressable>
            <Text style={styles.controlLabel}>End</Text>
          </View>

          <View style={styles.controlItem}>
            <Pressable
              onPress={() => { setSpeakerOn(!speakerOn); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.controlBtn, speakerOn && styles.controlBtnActive]}
            >
              <Ionicons name={speakerOn ? "volume-high" : "volume-medium"} size={26} color="#FFF" />
            </Pressable>
            <Text style={styles.controlLabel}>Speaker</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1A1A2E",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  callType: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  callTypeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  avatarSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pulseRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 40,
  },
  pulseRing2: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 30,
  },
  avatarWrap: {
    shadowColor: "#4A80F0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  callerName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginTop: 16,
  },
  callerHandle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  callStatus: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  controls: {
    width: "100%",
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  controlItem: {
    alignItems: "center",
    gap: 8,
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnActive: {
    backgroundColor: "#4A80F0",
  },
  endBtn: {
    backgroundColor: "#EF4444",
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  controlLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
