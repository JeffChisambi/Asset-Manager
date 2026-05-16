import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
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
      <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      <View style={styles.center}>
        <Ionicons
          name="person-circle-outline"
          size={80}
          color={colors.primary}
        />
        <Text style={[styles.name, { color: colors.foreground }]}>
          Sneaker Head
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Welcome to Kinetic Shoes
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
    gap: 8,
    paddingBottom: 80,
  },
  name: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
