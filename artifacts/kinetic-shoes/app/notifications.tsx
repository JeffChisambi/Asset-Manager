import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Notification = {
  id: string;
  type: "order" | "promo" | "social" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "order",
    title: "Order Shipped! 🚚",
    message: "Your Doorstep order has been shipped and is on the way.",
    time: "2m ago",
    read: false,
  },
  {
    id: "2",
    type: "promo",
    title: "Flash Sale: 20% Off",
    message: "Use code KINETIC20 at checkout for 20% off all Super Store items.",
    time: "1h ago",
    read: false,
  },
  {
    id: "3",
    type: "social",
    title: "New Friend Request",
    message: "Alex wants to connect with you.",
    time: "3h ago",
    read: true,
  },
  {
    id: "4",
    type: "system",
    title: "App Update Available",
    message: "Version 1.1 is here with new dark mode features and bug fixes.",
    time: "1d ago",
    read: true,
  },
  {
    id: "5",
    type: "order",
    title: "Order Delivered",
    message: "Your previous order #8991 was delivered successfully.",
    time: "3d ago",
    read: true,
  },
];

const ICONS: Record<Notification["type"], keyof typeof Ionicons.glyphMap> = {
  order: "cube-outline",
  promo: "pricetag-outline",
  social: "person-add-outline",
  system: "settings-outline",
};

const COLORS: Record<Notification["type"], string> = {
  order: "#13B734",
  promo: "#F7971E",
  social: "#11998E",
  system: "#8B8B8B",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }: { item: Notification }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: COLORS[item.type] + "20" }]}>
        <Ionicons name={ICONS[item.type]} size={20} color={COLORS[item.type]} />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{item.time}</Text>
        </View>
        <Text style={[styles.message, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.message}
        </Text>
      </View>

      {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Notifications</Text>
        <Pressable style={styles.backBtn}>
          <Ionicons name="checkmark-done-outline" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <FlatList
        data={NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 4,
  },
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
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
});
