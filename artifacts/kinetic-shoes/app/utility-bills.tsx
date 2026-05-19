import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Utility = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const UTILITIES: Utility[] = [
  { id: "1", title: "Electricity (ESCOM)", icon: "bulb-outline", color: "#F7971E" },
  { id: "2", title: "Water", icon: "water-outline", color: "#4A80F0" },
  { id: "3", title: "Mobile Airtime/Data", icon: "phone-portrait-outline", color: "#11998E" },
  { id: "4", title: "Internet/Wi-Fi", icon: "wifi-outline", color: "#C850C0" },
  { id: "5", title: "TV Subscription (DStv/GOtv)", icon: "tv-outline", color: "#E84393" },
  { id: "6", title: "House Rent", icon: "home-outline", color: "#1A6B4A" },
  { id: "7", title: "Security/Guard Services", icon: "shield-checkmark-outline", color: "#0F3460" },
  { id: "8", title: "School Fees Installments", icon: "school-outline", color: "#8B6914" },
];

export default function UtilityBillsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }: { item: Utility }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}>
        <Ionicons name={item.icon} size={22} color={item.color} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Utility Bills</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={UTILITIES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  screenTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
