import { Ionicons } from "@expo/vector-icons";
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

const { height: SCREEN_H } = Dimensions.get("window");

const BG_GRADIENTS: [string, string][] = [
  ["#13B734", "#0A8024"],
  ["#FF6B6B", "#C0392B"],
  ["#4ECDC4", "#1ABC9C"],
  ["#FFD93D", "#F39C12"],
  ["#A29BFE", "#6C5CE7"],
  ["#FD79A8", "#E84393"],
  ["#00B894", "#00695C"],
  ["#E17055", "#C0392B"],
];

const STICKERS = [
  "😀", "😂", "😍", "🔥", "🎉", "🙏", "✅", "💚",
  "🛍️", "📦", "🚚", "⭐", "👏", "😎", "🤩", "💪",
];

type StoryTab = "text" | "photo" | "voice" | "sticker";

export default function CreateStoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addStory } = useChat();

  const [tab, setTab] = useState<StoryTab>("text");
  const [text, setText] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => { clearInterval(timer); pulse.stop(); };
  }, [isRecording]);

  const hasContent = !!(text.trim() || mediaUri || voiceUri || selectedSticker);

  const handlePost = () => {
    if (!hasContent) return;
    if (mediaUri) {
      addStory({ type: mediaType === "video" ? "video" : "image", mediaUri });
    } else if (voiceUri) {
      addStory({
        type: "voice",
        mediaUri: voiceUri,
        audioDuration: recordingDuration,
        backgroundColor: BG_GRADIENTS[bgIndex][0],
      });
    } else if (selectedSticker) {
      addStory({
        type: "sticker",
        sticker: selectedSticker,
        backgroundColor: BG_GRADIENTS[bgIndex][0],
      });
    } else if (text.trim()) {
      addStory({
        type: "text",
        text: text.trim(),
        backgroundColor: BG_GRADIENTS[bgIndex][0],
      });
    }

    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType(result.assets[0].type === "video" ? "video" : "image");
      setVoiceUri(null);
      setSelectedSticker(null);
      setText("");
      setTab("photo");
    }
  };

  const startRecording = async () => {
    if (Platform.OS === "web") return;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.record();
      setVoiceUri(null);
      setMediaUri(null);
      setMediaType(null);
      setSelectedSticker(null);
      setRecordingDuration(0);
      setIsRecording(true);
    } catch (err) {
      console.warn("Failed to start recording", err);
    }
  };

  const finishRecording = async () => {
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      setVoiceUri(audioRecorder.uri);
    } finally {
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    try { await audioRecorder.stop(); } catch {}
    setIsRecording(false);
    setRecordingDuration(0);
    setVoiceUri(null);
  };

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 20 : insets.bottom;
  const [g1, g2] = BG_GRADIENTS[bgIndex];

  const fmtTime = (secs: number) =>
    `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Full-screen preview background */}
      {mediaUri && mediaType === "image" ? (
        <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={[g1, g2]} style={StyleSheet.absoluteFill} />
      )}

      {/* Dim overlay when media is present */}
      {mediaUri && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.25)" }]} />
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color="#FFF" />
        </Pressable>

        <Text style={styles.headerTitle}>New Status</Text>

        {/* Colour cycle (only visible for text/sticker) */}
        {(tab === "text" || tab === "sticker") && (
          <Pressable
            onPress={() => setBgIndex((i) => (i + 1) % BG_GRADIENTS.length)}
            style={styles.iconBtn}
          >
            <Ionicons name="color-palette-outline" size={24} color="#FFF" />
          </Pressable>
        )}
        {tab !== "text" && tab !== "sticker" && <View style={{ width: 44 }} />}
      </View>

      {/* ── Preview Area ─────────────────────────────────────────────────────── */}
      <View style={styles.preview} pointerEvents="box-none">
        {/* Text story */}
        {tab === "text" && !mediaUri && (
          <TextInput
            style={styles.textInput}
            placeholder="Type your status…"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={text}
            onChangeText={setText}
            multiline
            textAlign="center"
          />
        )}

        {/* Sticker */}
        {tab === "sticker" && selectedSticker && (
          <Text style={styles.bigSticker}>{selectedSticker}</Text>
        )}

        {/* Photo/Video */}
        {tab === "photo" && !mediaUri && (
          <View style={styles.tapToAdd}>
            <Ionicons name="image-outline" size={64} color="rgba(255,255,255,0.7)" />
            <Text style={styles.tapToAddText}>Tap below to add photo/video</Text>
          </View>
        )}
        {tab === "photo" && mediaUri && mediaType === "video" && (
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={72} color="#FFF" />
            <Text style={styles.videoText}>Video ready</Text>
          </View>
        )}

        {/* Voice */}
        {tab === "voice" && (
          <View style={styles.voiceCenter}>
            {isRecording ? (
              <>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <View style={styles.recordingPulse}>
                    <Ionicons name="mic" size={40} color="#FFF" />
                  </View>
                </Animated.View>
                <Text style={styles.voiceTimer}>{fmtTime(recordingDuration)}</Text>
                <Text style={styles.voiceHint}>Recording… tap stop when done</Text>
                <View style={styles.voiceCtrl}>
                  <Pressable onPress={cancelRecording} style={styles.voiceBtn}>
                    <Ionicons name="close" size={24} color="#FFF" />
                    <Text style={styles.voiceBtnLabel}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={finishRecording} style={[styles.voiceBtn, styles.voiceBtnDone]}>
                    <Ionicons name="stop" size={24} color="#000" />
                    <Text style={[styles.voiceBtnLabel, { color: "#000" }]}>Stop</Text>
                  </Pressable>
                </View>
              </>
            ) : voiceUri ? (
              <>
                <Ionicons name="mic-circle" size={80} color="#FFF" />
                <Text style={styles.voiceReadyTitle}>Voice status ready</Text>
                <Text style={styles.voiceTimer}>{fmtTime(recordingDuration)}</Text>
                <Pressable onPress={() => { setVoiceUri(null); setRecordingDuration(0); }} style={styles.retakeBtn}>
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={styles.retakeBtnText}>Re-record</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Ionicons name="mic-outline" size={80} color="rgba(255,255,255,0.8)" />
                <Text style={styles.voiceHint}>Tap the mic button below to record</Text>
              </>
            )}
          </View>
        )}
      </View>

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {(["text", "photo", "voice", "sticker"] as StoryTab[]).map((t) => {
          const icons: Record<StoryTab, any> = {
            text: "text-outline",
            photo: "image-outline",
            voice: "mic-outline",
            sticker: "happy-outline",
          };
          const labels: Record<StoryTab, string> = {
            text: "Text",
            photo: "Photo",
            voice: "Voice",
            sticker: "Emoji",
          };
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabItem, active && styles.tabItemActive]}
            >
              <Ionicons name={icons[t]} size={20} color={active ? "#FFF" : "rgba(255,255,255,0.55)"} />
              <Text style={[styles.tabLabel, { color: active ? "#FFF" : "rgba(255,255,255,0.55)" }]}>
                {labels[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Tab-specific tools ────────────────────────────────────────────────── */}
      <View style={[styles.toolRow, { paddingBottom: 8 }]}>
        {tab === "photo" && (
          <Pressable style={styles.toolBtn} onPress={pickMedia}>
            <Ionicons name="folder-open-outline" size={22} color="#FFF" />
            <Text style={styles.toolBtnLabel}>Choose</Text>
          </Pressable>
        )}
        {tab === "voice" && !isRecording && !voiceUri && (
          <Pressable style={styles.toolBtn} onPress={startRecording} disabled={Platform.OS === "web"}>
            <Ionicons name="mic" size={22} color="#FFF" />
            <Text style={styles.toolBtnLabel}>Start Recording</Text>
          </Pressable>
        )}
        {tab === "sticker" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickerRail}>
            {STICKERS.map((sticker) => (
              <Pressable
                key={sticker}
                onPress={() => setSelectedSticker(sticker)}
                style={[
                  styles.stickerBtn,
                  selectedSticker === sticker && styles.stickerBtnActive,
                ]}
              >
                <Text style={styles.stickerText}>{sticker}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {tab === "text" && (
          <View style={styles.charCount}>
            <Text style={styles.charCountText}>{text.length}/200</Text>
          </View>
        )}
      </View>

      {/* ── Post Button ──────────────────────────────────────────────────────── */}
      <View style={[styles.postRow, { paddingBottom: bottomPad + 12 }]}>
        <Pressable
          style={[styles.postBtn, !hasContent && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!hasContent}
        >
          <Text style={styles.postBtnText}>
            {hasContent ? "Share Status" : "Add content above"}
          </Text>
          {hasContent && <Ionicons name="arrow-forward" size={20} color="#000" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Preview
  preview: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  textInput: {
    width: "100%",
    color: "#FFF",
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textAlign: "center",
    maxHeight: SCREEN_H * 0.35,
  },
  bigSticker: { fontSize: 100, textAlign: "center" },
  tapToAdd: { alignItems: "center", gap: 12 },
  tapToAddText: { color: "rgba(255,255,255,0.7)", fontSize: 16, fontFamily: "Inter_400Regular" },
  videoOverlay: { alignItems: "center", gap: 10 },
  videoText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },

  // Voice
  voiceCenter: { alignItems: "center", gap: 14 },
  recordingPulse: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTimer: { color: "#FFF", fontSize: 36, fontFamily: "Inter_800ExtraBold" },
  voiceHint: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  voiceReadyTitle: { color: "#FFF", fontSize: 20, fontFamily: "Inter_700Bold" },
  voiceCtrl: { flexDirection: "row", gap: 16, marginTop: 8 },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  voiceBtnDone: { backgroundColor: "#FFF" },
  voiceBtnLabel: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  retakeBtnText: { color: "#FFF", fontFamily: "Inter_500Medium", fontSize: 13 },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.35)",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 4,
    marginBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    gap: 3,
    borderRadius: 12,
  },
  tabItemActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  tabLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },

  // Tool row (tab-specific content)
  toolRow: {
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
  },
  toolBtnLabel: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  stickerRail: { gap: 10, paddingVertical: 4 },
  stickerBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  stickerBtnActive: { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.25)" },
  stickerText: { fontSize: 26 },
  charCount: { alignItems: "flex-end", width: "100%" },
  charCountText: { color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", fontSize: 12 },

  // Post button — always on its own row, always visible
  postRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingVertical: 16,
  },
  postBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  postBtnText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
