import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  Dimensions,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { ThemeMode, useTheme } from "@/context/ThemeContext";

const { width } = Dimensions.get("window");

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { themeMode, setThemeMode } = useTheme();

  const [activeStatus, setActiveStatus] = useState("online");
  const [currentWallpaper, setCurrentWallpaper] = useState("default");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  
  const [msgNotif, setMsgNotif] = useState(true);
  const [friendReqNotif, setFriendReqNotif] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const status = await AsyncStorage.getItem("user_active_status");
        if (status) setActiveStatus(status);
        const wallpaper = await AsyncStorage.getItem("chat_wallpaper");
        if (wallpaper) setCurrentWallpaper(wallpaper);
        const msg = await AsyncStorage.getItem("msg_notif");
        if (msg) setMsgNotif(msg === "true");
        const freq = await AsyncStorage.getItem("friend_req_notif");
        if (freq) setFriendReqNotif(freq === "true");
      } catch {}
    }
    loadSettings();
  }, []);

  const toggleMsgNotif = async (val: boolean) => {
    setMsgNotif(val);
    await AsyncStorage.setItem("msg_notif", val ? "true" : "false");
    if (val && Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleFriendReqNotif = async (val: boolean) => {
    setFriendReqNotif(val);
    await AsyncStorage.setItem("friend_req_notif", val ? "true" : "false");
    if (val && Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const THEMES: { label: string; value: ThemeMode; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: "System Default", value: "system", icon: "phone-portrait-outline" },
    { label: "Light", value: "light", icon: "sunny-outline" },
    { label: "Dark", value: "dark", icon: "moon-outline" },
  ];

  const getStatusDetails = (status: string) => {
    switch (status) {
      case "away":
        return { label: "Away", color: "#EAB308" };
      case "dnd":
        return { label: "Do Not Disturb", color: "#EF4444" };
      case "invisible":
        return { label: "Invisible", color: "#9CA3AF" };
      default:
        return { label: "Online", color: "#22C55E" };
    }
  };

  const getWallpaperLabel = (wp: string) => {
    switch (wp) {
      case "peach": return "Peach Burst";
      case "lavender": return "Lavender Dream";
      case "stealth": return "Stealth Slate";
      case "sunset": return "Sunset Glow";
      case "neon": return "Neon Waves";
      case "sneakers": return "Sneaker Grid";
      default: return "Default";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* APPEARANCE */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {THEMES.map((theme, index) => {
            const isActive = themeMode === theme.value;
            return (
              <Pressable
                key={theme.value}
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  index === THEMES.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => setThemeMode(theme.value)}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name={theme.icon} size={22} color={isActive ? colors.primary : colors.foreground} />
                  <Text style={[styles.rowText, { color: isActive ? colors.primary : colors.foreground }]}>
                    {theme.label}
                  </Text>
                </View>
                {isActive && <Ionicons name="checkmark" size={22} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>

        {/* CHAT PREFERENCES */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 32 }]}>CHAT PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Active Status Row */}
          <Pressable
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => setShowStatusModal(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="ellipse" size={22} color={getStatusDetails(activeStatus).color} />
              <View>
                <Text style={[styles.rowText, { color: colors.foreground }]}>Active Status</Text>
                <Text style={[styles.rowSubtext, { color: colors.mutedForeground }]}>
                  Current: {getStatusDetails(activeStatus).label}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>

          {/* Chat Wallpaper Row */}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => setShowWallpaperModal(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="image-outline" size={22} color={colors.primary} />
              <View>
                <Text style={[styles.rowText, { color: colors.foreground }]}>Chat Wallpaper</Text>
                <Text style={[styles.rowSubtext, { color: colors.mutedForeground }]}>
                  Current: {getWallpaperLabel(currentWallpaper)}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* NOTIFICATIONS */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 32 }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="chatbubbles-outline" size={22} color={colors.foreground} />
              <View>
                <Text style={[styles.rowText, { color: colors.foreground }]}>Messages</Text>
                <Text style={[styles.rowSubtext, { color: colors.mutedForeground }]}>
                  Alerts for new messages
                </Text>
              </View>
            </View>
            <Switch
              value={msgNotif}
              onValueChange={toggleMsgNotif}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === "ios" ? undefined : "#FFF"}
            />
          </View>

          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="person-add-outline" size={22} color={colors.foreground} />
              <View>
                <Text style={[styles.rowText, { color: colors.foreground }]}>Friend Requests</Text>
                <Text style={[styles.rowSubtext, { color: colors.mutedForeground }]}>
                  Alerts for new connection requests
                </Text>
              </View>
            </View>
            <Switch
              value={friendReqNotif}
              onValueChange={toggleFriendReqNotif}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === "ios" ? undefined : "#FFF"}
            />
          </View>
        </View>

        {/* ABOUT */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 32 }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={[styles.rowText, { color: colors.foreground }]}>Version</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Active Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowStatusModal(false)} />
          <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Set Active Status</Text>
            </View>
            
            <View style={styles.sheetContent}>
              {[
                { key: "online", label: "Online", desc: "Show as active and responsive", color: "#22C55E", icon: "ellipse" },
                { key: "away", label: "Away", desc: "Appear as currently away", color: "#EAB308", icon: "ellipse" },
                { key: "dnd", label: "Do Not Disturb", desc: "Mute alerts and sound", color: "#EF4444", icon: "ellipse" },
                { key: "invisible", label: "Invisible", desc: "Appear offline to others", color: "#9CA3AF", icon: "ellipse-outline" },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [
                    styles.sheetRow,
                    { borderBottomColor: colors.border },
                    activeStatus === item.key && { backgroundColor: colors.muted + "28" },
                    pressed && { backgroundColor: colors.muted }
                  ]}
                  onPress={async () => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setActiveStatus(item.key);
                    await AsyncStorage.setItem("user_active_status", item.key);
                    setShowStatusModal(false);
                  }}
                >
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.sheetRowLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.sheetRowDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                  </View>
                  {activeStatus === item.key && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Wallpaper Modal */}
      <Modal
        visible={showWallpaperModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWallpaperModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowWallpaperModal(false)} />
          <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border, height: "70%" }]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Chat Wallpapers</Text>
            </View>
            
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 10 }]}>CHOOSE BACKDROP</Text>
              
              <View style={styles.wallpaperGrid}>
                {[
                  { key: "default", label: "Default", color: colors.background, preview: null },
                  { key: "peach", label: "Peach Burst", color: "#FFF2EE", preview: null },
                  { key: "lavender", label: "Lavender Dream", color: "#F4EDFF", preview: null },
                  { key: "stealth", label: "Stealth Slate", color: "#16161A", preview: null },
                  { key: "sunset", label: "Sunset Glow", color: "#FF9966", isGradient: true, colors: ["#FF9966", "#FF5E62"] },
                  { key: "neon", label: "Neon Waves", color: "#00F2FE", isGradient: true, colors: ["#00F2FE", "#4FACFE"] },
                  { key: "sneakers", label: "Sneaker Grid", color: "#FFF", isSneaker: true },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.wallpaperCard,
                      { borderColor: currentWallpaper === item.key ? colors.primary : colors.border }
                    ]}
                    onPress={async () => {
                      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setCurrentWallpaper(item.key);
                      await AsyncStorage.setItem("chat_wallpaper", item.key);
                      setShowWallpaperModal(false);
                    }}
                  >
                    <View style={[styles.wallpaperPreview, { backgroundColor: item.color }]}>
                      {item.isGradient && item.colors && (
                        <LinearGradient colors={item.colors as any} style={StyleSheet.absoluteFillObject} />
                      )}
                      {item.isSneaker && (
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", flexWrap: "wrap", flexDirection: "row", gap: 6, padding: 4 }]}>
                          {Array.from({ length: 6 }).map((_, i) => (
                            <Text key={i} style={{ fontSize: 10 }}>👟</Text>
                          ))}
                        </View>
                      )}
                      {currentWallpaper === item.key && (
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" }]}>
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                          </View>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.wallpaperLabel, { color: colors.foreground }]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  rowSubtext: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  
  // Sheet & Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: 12,
    maxHeight: "85%",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  sheetContent: {
    paddingBottom: 40,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetRowLabel: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  sheetRowDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  wallpaperGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  wallpaperCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  wallpaperPreview: {
    height: 100,
    position: "relative",
  },
  wallpaperLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    padding: 10,
    textAlign: "center",
  },
});
