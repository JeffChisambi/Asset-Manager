import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

const BG_COLORS = [
  "#13B734",
  "#FF6B6B",
  "#4ECDC4",
  "#FFD93D",
  "#A29BFE",
  "#FD79A8",
  "#00B894",
  "#E17055",
];
const STICKERS = [
  "😀",
  "😂",
  "😍",
  "🔥",
  "🎉",
  "🙏",
  "✅",
  "💚",
  "🛍️",
  "📦",
  "🚚",
  "⭐",
];

export default function CreateStoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addStory } = useChat();

  const [text, setText] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const handlePost = () => {
    if (mediaUri) {
      addStory({ type: mediaType === "video" ? "video" : "image", mediaUri });
    } else if (voiceUri) {
      addStory({
        type: "voice",
        mediaUri: voiceUri,
        audioDuration: recordingDuration,
        backgroundColor: BG_COLORS[bgIndex],
      });
    } else if (selectedSticker) {
      addStory({
        type: "sticker",
        sticker: selectedSticker,
        backgroundColor: BG_COLORS[bgIndex],
      });
    } else if (text.trim()) {
      addStory({
        type: "text",
        text: text.trim(),
        backgroundColor: BG_COLORS[bgIndex],
      });
    } else {
      return;
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
    }
  };

  const startRecording = async () => {
    if (Platform.OS === "web") return;
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    recordingRef.current = recording;
    setVoiceUri(null);
    setMediaUri(null);
    setMediaType(null);
    setSelectedSticker(null);
    setRecordingDuration(0);
    setIsRecording(true);
  };

  const finishRecording = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      setVoiceUri(recordingRef.current.getURI());
    } finally {
      recordingRef.current = null;
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    try {
      await recordingRef.current?.stopAndUnloadAsync();
    } catch {}
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
    setVoiceUri(null);
  };

  const chooseSticker = (sticker: string) => {
    setSelectedSticker(sticker);
    setMediaUri(null);
    setMediaType(null);
    setVoiceUri(null);
    setText("");
  };

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 20 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        { backgroundColor: mediaUri ? "#000" : BG_COLORS[bgIndex] },
      ]}
      behavior="padding"
    >
      {/* Background Media */}
      {mediaUri && mediaType === "image" && (
        <Image
          source={{ uri: mediaUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      {mediaUri && mediaType === "video" && (
        <View style={[StyleSheet.absoluteFill, styles.videoPreview]}>
          <Ionicons name="play-circle" size={72} color="#FFF" />
          <Text style={styles.videoPreviewText}>Video status ready</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.iconBtn}
        >
          <Ionicons name="close" size={28} color="#FFF" />
        </Pressable>

        <View style={styles.headerActions}>
          {!mediaUri && (
            <Pressable
              onPress={() => setBgIndex((i) => (i + 1) % BG_COLORS.length)}
              style={styles.iconBtn}
            >
              <Ionicons name="color-palette" size={24} color="#FFF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {!mediaUri && !voiceUri && !selectedSticker && (
          <TextInput
            style={styles.textInput}
            placeholder="Type a story..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            textAlign="center"
          />
        )}
        {selectedSticker && (
          <Text style={styles.bigSticker}>{selectedSticker}</Text>
        )}
        {(isRecording || voiceUri) && (
          <View style={styles.voicePreview}>
            <Ionicons
              name={voiceUri ? "mic-circle" : "radio-button-on"}
              size={64}
              color="#FFF"
            />
            <Text style={styles.voicePreviewTitle}>
              {voiceUri ? "Voice status ready" : "Recording voice status"}
            </Text>
            <Text style={styles.voicePreviewTime}>
              {Math.floor(recordingDuration / 60)}:
              {(recordingDuration % 60).toString().padStart(2, "0")}
            </Text>
            {isRecording && (
              <View style={styles.voiceActions}>
                <Pressable
                  onPress={cancelRecording}
                  style={styles.voiceActionBtn}
                >
                  <Ionicons name="close" size={22} color="#FFF" />
                </Pressable>
                <Pressable
                  onPress={finishRecording}
                  style={[styles.voiceActionBtn, styles.voiceDoneBtn]}
                >
                  <Ionicons name="checkmark" size={22} color="#000" />
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 12 }]}>
        <View style={styles.tools}>
          <Pressable onPress={pickMedia} style={styles.toolBtn}>
            <Ionicons name="image" size={24} color="#FFF" />
          </Pressable>
          <Pressable
            onPress={startRecording}
            style={[styles.toolBtn, isRecording && { opacity: 0.5 }]}
            disabled={isRecording || Platform.OS === "web"}
          >
            <Ionicons name="mic" size={24} color="#FFF" />
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stickerRail}
          >
            {STICKERS.map((sticker) => (
              <Pressable
                key={sticker}
                onPress={() => chooseSticker(sticker)}
                style={styles.storyStickerBtn}
              >
                <Text style={styles.storyStickerText}>{sticker}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Pressable
          style={[
            styles.postBtn,
            {
              opacity:
                text.trim() || mediaUri || voiceUri || selectedSticker
                  ? 1
                  : 0.5,
            },
          ]}
          onPress={handlePost}
          disabled={!text.trim() && !mediaUri && !voiceUri && !selectedSticker}
        >
          <Text style={styles.postBtnText}>Post Story</Text>
          <Ionicons name="chevron-forward" size={18} color="#000" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerActions: { flexDirection: "row", gap: 12 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  textInput: {
    color: "#FFF",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  tools: { flexDirection: "row", gap: 12 },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  postBtnText: {
    color: "#000",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  videoPreview: {
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  videoPreviewText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  bigSticker: {
    fontSize: 96,
    textAlign: "center",
  },
  voicePreview: {
    alignItems: "center",
    gap: 10,
  },
  voicePreviewTitle: {
    color: "#FFF",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  voicePreviewTime: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
  },
  voiceActions: { flexDirection: "row", gap: 14, marginTop: 8 },
  voiceActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceDoneBtn: { backgroundColor: "#FFF" },
  stickerRail: { gap: 8, alignItems: "center", paddingRight: 8 },
  storyStickerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  storyStickerText: { fontSize: 24 },
});
