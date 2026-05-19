import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

const BG_COLORS = [
  "#4A80F0", "#FF6B6B", "#4ECDC4", "#FFD93D",
  "#A29BFE", "#FD79A8", "#00B894", "#E17055",
];

export default function CreateStoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addStory } = useChat();

  const [text, setText] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [mediaUri, setMediaUri] = useState<string | null>(null);

  const handlePost = () => {
    if (mediaUri) {
      addStory({ type: "image", mediaUri });
    } else if (text.trim()) {
      addStory({ type: "text", text: text.trim(), backgroundColor: BG_COLORS[bgIndex] });
    } else {
      return;
    }
    
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 20 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: mediaUri ? "#000" : BG_COLORS[bgIndex] }]}
      behavior="padding"
    >
      {/* Background Media */}
      {mediaUri && (
        <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
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
        {!mediaUri && (
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
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 12 }]}>
        <View style={styles.tools}>
          <Pressable onPress={pickMedia} style={styles.toolBtn}>
            <Ionicons name="image" size={24} color="#FFF" />
          </Pressable>
        </View>

        <Pressable 
          style={[styles.postBtn, { opacity: (text.trim() || mediaUri) ? 1 : 0.5 }]}
          onPress={handlePost}
          disabled={!text.trim() && !mediaUri}
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
});
