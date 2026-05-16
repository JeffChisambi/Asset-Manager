import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function AddScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPad + 12 },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        Add to Wishlist
      </Text>
      <View style={styles.center}>
        <Ionicons name="add-circle-outline" size={56} color={colors.primary} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Save your favourite shoes
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
});
