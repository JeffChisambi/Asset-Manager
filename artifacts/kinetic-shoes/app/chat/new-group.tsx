import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserAvatar } from "@/components/chat/UserAvatar";
import { useChat, type AppUser } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

export default function NewGroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { friends, createGroup } = useChat();

  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setError("");
  };

  const handleCreate = () => {
    const name = groupName.trim();
    if (!name) {
      setError("Please enter a group name.");
      return;
    }
    if (selected.size === 0) {
      setError("Please select at least one member.");
      return;
    }
    const convId = createGroup(name, Array.from(selected));
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.replace(`/chat/${convId}`);
  };

  const selectedFriends = friends.filter((f) => selected.has(f.id));

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
            paddingTop: topPad + 8,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            New Group
          </Text>
          <Pressable
            onPress={handleCreate}
            disabled={!groupName.trim() || selected.size === 0}
            style={[
              styles.createBtn,
              {
                backgroundColor:
                  groupName.trim() && selected.size > 0
                    ? colors.primary
                    : colors.muted,
              },
            ]}
          >
            <Text
              style={[
                styles.createBtnText,
                {
                  color:
                    groupName.trim() && selected.size > 0
                      ? "#FFF"
                      : colors.mutedForeground,
                },
              ]}
            >
              Create
            </Text>
          </Pressable>
        </View>

        {/* Group Name */}
        <View style={styles.nameSection}>
          <View style={[styles.groupIconInput, { backgroundColor: colors.primary }]}>
            <Text style={styles.groupIconText}>
              {groupName.trim().slice(0, 2).toUpperCase() || "G"}
            </Text>
          </View>
          <TextInput
            style={[
              styles.nameInput,
              {
                backgroundColor: colors.muted,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            placeholder="Group name…"
            placeholderTextColor={colors.mutedForeground}
            value={groupName}
            onChangeText={(t) => { setGroupName(t); setError(""); }}
            autoFocus
            maxLength={40}
          />
        </View>

        {!!error && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error}
          </Text>
        )}

        {/* Selected preview */}
        {selected.size > 0 && (
          <View style={[styles.selectedRow, { borderBottomColor: colors.border }]}>
            <FlatList
              horizontal
              data={selectedFriends}
              keyExtractor={(f) => f.id}
              contentContainerStyle={styles.selectedList}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => toggleMember(item.id)}
                  style={styles.selectedChip}
                >
                  <UserAvatar
                    displayName={item.displayName}
                    avatarColor={item.avatarColor}
                    size={36}
                  />
                  <View
                    style={[styles.deselectBadge, { backgroundColor: colors.foreground }]}
                  >
                    <Ionicons name="close" size={10} color={colors.background} />
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* Friends List */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            ADD MEMBERS
          </Text>
        </View>

        {friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No friends yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add friends first before creating a group chat.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backToChats, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.backToChatsText}>Go Back</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(f) => f.id}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom:
                  Platform.OS === "web" ? 34 : insets.bottom + 20,
              },
            ]}
            renderItem={({ item }: { item: AppUser }) => {
              const isSelected = selected.has(item.id);
              return (
                <Pressable
                  onPress={() => toggleMember(item.id)}
                  style={({ pressed }) => [
                    styles.friendRow,
                    {
                      backgroundColor: pressed
                        ? colors.muted
                        : isSelected
                        ? colors.primary + "0D"
                        : colors.background,
                    },
                  ]}
                >
                  <UserAvatar
                    displayName={item.displayName}
                    avatarColor={item.avatarColor}
                    size={48}
                  />
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: colors.foreground }]}>
                      {item.displayName}
                    </Text>
                    <Text style={[styles.friendHandle, { color: colors.mutedForeground }]}>
                      @{item.username}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? colors.primary : "transparent",
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    )}
                  </View>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => (
              <View
                style={[styles.separator, { backgroundColor: colors.border }]}
              />
            )}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  createBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  nameSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  groupIconInput: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  groupIconText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  nameInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  errorText: {
    paddingHorizontal: 16,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  selectedRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEEEEE",
    paddingVertical: 8,
  },
  selectedList: { paddingHorizontal: 16, gap: 8 },
  selectedChip: { position: "relative", marginRight: 4 },
  deselectBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  listContent: { paddingTop: 4 },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  friendInfo: { flex: 1, gap: 2 },
  friendName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  friendHandle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 76 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  backToChats: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 100,
    marginTop: 8,
  },
  backToChatsText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
