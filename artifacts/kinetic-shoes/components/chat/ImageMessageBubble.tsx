import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

interface ImageMessageBubbleProps {
  imageUri: string;
  isMine: boolean;
  timestamp: number;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function ImageMessageBubble({
  imageUri,
  isMine,
  timestamp,
}: ImageMessageBubbleProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
        <Pressable
          onPress={() => setExpanded(true)}
          style={[
            styles.bubble,
            isMine
              ? { borderBottomRightRadius: 4 }
              : { borderBottomLeftRadius: 4, borderColor: colors.border, borderWidth: 1 },
            { backgroundColor: isMine ? colors.primary : colors.muted },
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
          />
          <Text
            style={[
              styles.time,
              { color: isMine ? "rgba(255,255,255,0.7)" : colors.mutedForeground },
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
          <Pressable
            onPress={() => setExpanded(false)}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
          <Image
            source={{ uri: imageUri }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 2, paddingHorizontal: 12 },
  rowRight: { alignItems: "flex-end" },
  rowLeft: { alignItems: "flex-start" },
  bubble: {
    borderRadius: 18,
    overflow: "hidden",
    maxWidth: width * 0.65,
    gap: 0,
  },
  image: {
    width: width * 0.6,
    height: width * 0.6,
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
    backgroundColor: "rgba(0,0,0,0.92)",
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
  fullImage: {
    width: width,
    height: width * 1.2,
  },
});
