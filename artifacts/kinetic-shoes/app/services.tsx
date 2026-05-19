import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Service = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route?: string;
};

const SERVICES: Service[] = [
  { id: "1", title: "Utility Bills", subtitle: "Electricity, Water, Internet & more", icon: "flash-outline", color: "#F7971E", route: "/utility-bills" },
  { id: "2", title: "Ride Hailing", subtitle: "Book a cab instantly", icon: "car-outline", color: "#4A80F0" },
  { id: "3", title: "Food Delivery", subtitle: "Order from top restaurants", icon: "fast-food-outline", color: "#E84393" },
  { id: "4", title: "Flight Booking", subtitle: "Cheap flights globally", icon: "airplane-outline", color: "#0F3460" },
  { id: "5", title: "Hotels", subtitle: "Book rooms and stays", icon: "bed-outline", color: "#11998E" },
  { id: "6", title: "Events", subtitle: "Concerts, sports & movies", icon: "ticket-outline", color: "#8B6914" },
];

export default function ServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }: { item: Service }) => (
    <Pressable
      onPress={() => item.route && router.push(item.route as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Services</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={SERVICES}
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
