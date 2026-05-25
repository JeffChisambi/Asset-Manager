import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

const MIN_ANONYMOUS_INVITES = 5;
const MIN_ANONYMOUS_CAPACITY = 6;
const MAX_ANONYMOUS_CAPACITY = 50;

type GroupMode = "normal" | "anonymous";

function normalizeLocation(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

export default function NewGroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, allUsers, friends, createGroup } = useChat();

  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupMode, setGroupMode] = useState<GroupMode>("normal");
  const [memberLimit, setMemberLimit] = useState(MIN_ANONYMOUS_CAPACITY);
  const [locationInput, setLocationInput] = useState("");
  const [allowedLocations, setAllowedLocations] = useState<string[]>([]);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const locationSuggestions = useMemo(() => {
    const entries = new Map<string, string>();
    [currentUser, ...friends, ...allUsers].forEach((user) => {
      const location = user?.location?.trim();
      if (!location) return;
      const key = normalizeLocation(location);
      if (!entries.has(key)) entries.set(key, location);
    });
    return Array.from(entries.values()).sort((a, b) => a.localeCompare(b));
  }, [allUsers, currentUser, friends]);

  const selectedFriends = useMemo(
    () => friends.filter((friend) => selected.has(friend.id)),
    [friends, selected],
  );

  useEffect(() => {
    if (groupMode !== "anonymous") return;
    setMemberLimit((current) =>
      Math.max(current, selected.size + 1, MIN_ANONYMOUS_CAPACITY),
    );
    if (allowedLocations.length === 0 && currentUser?.location?.trim()) {
      setAllowedLocations([currentUser.location.trim()]);
    }
  }, [
    allowedLocations.length,
    currentUser?.location,
    groupMode,
    selected.size,
  ]);

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

  const addAllowedLocation = () => {
    const nextLocation = locationInput.trim();
    if (!nextLocation) return;

    const exists = allowedLocations.some(
      (location) =>
        normalizeLocation(location) === normalizeLocation(nextLocation),
    );
    if (!exists) {
      setAllowedLocations((prev) => [...prev, nextLocation]);
    }
    setLocationInput("");
    setError("");
  };

  const removeAllowedLocation = (location: string) => {
    setAllowedLocations((prev) =>
      prev.filter(
        (item) => normalizeLocation(item) !== normalizeLocation(location),
      ),
    );
  };

  const bumpLimit = (delta: number) => {
    setMemberLimit((current) => {
      const minimum = Math.max(MIN_ANONYMOUS_CAPACITY, selected.size + 1);
      const next = current + delta;
      return Math.min(MAX_ANONYMOUS_CAPACITY, Math.max(minimum, next));
    });
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

    if (groupMode === "anonymous") {
      if (selected.size < MIN_ANONYMOUS_INVITES) {
        setError("Anonymous group chats need at least 5 invited people.");
        return;
      }
      if (allowedLocations.length === 0) {
        setError("Add at least one allowed location for the anonymous group.");
        return;
      }
      if (memberLimit < selected.size + 1) {
        setError(
          `Member limit must be at least ${selected.size + 1} including you.`,
        );
        return;
      }
    }

    const convId = createGroup({
      name,
      memberIds: Array.from(selected),
      groupMode: groupMode === "anonymous" ? "anonymous" : "standard",
      memberLimit: groupMode === "anonymous" ? memberLimit : undefined,
      allowedLocations:
        groupMode === "anonymous" ? allowedLocations : undefined,
    });

    if (!convId) {
      setError(
        "Could not create this group. Check the requirements and try again.",
      );
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.replace(`/chat/${convId}`);
  };

  const isCreateEnabled =
    !!groupName.trim() &&
    selected.size > 0 &&
    (groupMode === "normal"
      ? true
      : selected.size >= MIN_ANONYMOUS_INVITES &&
        allowedLocations.length > 0 &&
        memberLimit >= selected.size + 1);

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
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.headerBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              New Group
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Choose normal or anonymous mode
            </Text>
          </View>
          <Pressable
            onPress={handleCreate}
            disabled={!isCreateEnabled}
            style={[
              styles.createBtn,
              {
                backgroundColor: isCreateEnabled
                  ? colors.primary
                  : colors.muted,
              },
            ]}
          >
            <Text
              style={[
                styles.createBtnText,
                {
                  color: isCreateEnabled ? "#FFF" : colors.mutedForeground,
                },
              ]}
            >
              Create
            </Text>
          </Pressable>
        </View>

        <View style={styles.modeSection}>
          <Pressable
            onPress={() => setGroupMode("normal")}
            style={[
              styles.modeCard,
              {
                backgroundColor: colors.card,
                borderColor:
                  groupMode === "normal" ? colors.primary : colors.border,
              },
              groupMode === "normal" && {
                backgroundColor: colors.primary + "10",
              },
            ]}
          >
            <View
              style={[
                styles.modeIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.modeTextWrap}>
              <Text style={[styles.modeTitle, { color: colors.foreground }]}>
                Normal group
              </Text>
              <Text
                style={[styles.modeText, { color: colors.mutedForeground }]}
              >
                Members can see the participant list and member count.
              </Text>
            </View>
            <View style={[styles.radio, { borderColor: colors.border }]}>
              {groupMode === "normal" && (
                <View
                  style={[
                    styles.radioInner,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={() => setGroupMode("anonymous")}
            style={[
              styles.modeCard,
              {
                backgroundColor: colors.card,
                borderColor:
                  groupMode === "anonymous" ? colors.primary : colors.border,
              },
              groupMode === "anonymous" && {
                backgroundColor: colors.primary + "10",
              },
            ]}
          >
            <View
              style={[
                styles.modeIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons
                name="eye-off-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.modeTextWrap}>
              <Text style={[styles.modeTitle, { color: colors.foreground }]}>
                Anonymous group chat
              </Text>
              <Text
                style={[styles.modeText, { color: colors.mutedForeground }]}
              >
                Hides member identities, member counts, and sender names inside
                the chat.
              </Text>
            </View>
            <View style={[styles.radio, { borderColor: colors.border }]}>
              {groupMode === "anonymous" && (
                <View
                  style={[
                    styles.radioInner,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </View>
          </Pressable>
        </View>

        <View style={styles.nameSection}>
          <View
            style={[styles.groupIconInput, { backgroundColor: colors.primary }]}
          >
            <Ionicons
              name={groupMode === "anonymous" ? "lock-closed" : "people"}
              size={24}
              color="#FFF"
            />
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
            placeholder={
              groupMode === "anonymous"
                ? "Anonymous group name…"
                : "Group name…"
            }
            placeholderTextColor={colors.mutedForeground}
            value={groupName}
            onChangeText={(t) => {
              setGroupName(t);
              setError("");
            }}
            autoFocus
            maxLength={40}
          />
        </View>

        {groupMode === "anonymous" && (
          <View
            style={[
              styles.noticeCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.noticeRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.noticeTitle, { color: colors.foreground }]}>
                Anonymous controls
              </Text>
            </View>
            <Text
              style={[styles.noticeText, { color: colors.mutedForeground }]}
            >
              Invite at least 5 people, set a join limit, and restrict the chat
              to selected locations.
            </Text>
          </View>
        )}

        {!!error && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error}
          </Text>
        )}

        {selected.size > 0 && (
          <View
            style={[styles.selectedRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.selectedSummary}>
              <Text
                style={[styles.selectedTitle, { color: colors.foreground }]}
              >
                {selected.size} invited
              </Text>
              <Text
                style={[styles.selectedSub, { color: colors.mutedForeground }]}
              >
                {groupMode === "anonymous"
                  ? `Anonymous groups require at least ${MIN_ANONYMOUS_INVITES} invites`
                  : "These people will be added immediately"}
              </Text>
            </View>
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
                    style={[
                      styles.deselectBadge,
                      { backgroundColor: colors.foreground },
                    ]}
                  >
                    <Ionicons
                      name="close"
                      size={10}
                      color={colors.background}
                    />
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}

        {groupMode === "anonymous" && (
          <View
            style={[
              styles.configCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.configRow}>
              <View style={styles.configCopy}>
                <Text
                  style={[styles.configTitle, { color: colors.foreground }]}
                >
                  Join limit
                </Text>
                <Text
                  style={[styles.configText, { color: colors.mutedForeground }]}
                >
                  Includes you. Minimum is{" "}
                  {Math.max(MIN_ANONYMOUS_CAPACITY, selected.size + 1)}.
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => bumpLimit(-1)}
                  style={[styles.stepperBtn, { backgroundColor: colors.muted }]}
                >
                  <Ionicons name="remove" size={18} color={colors.foreground} />
                </Pressable>
                <Text
                  style={[styles.stepperValue, { color: colors.foreground }]}
                >
                  {memberLimit}
                </Text>
                <Pressable
                  onPress={() => bumpLimit(1)}
                  style={[styles.stepperBtn, { backgroundColor: colors.muted }]}
                >
                  <Ionicons name="add" size={18} color={colors.foreground} />
                </Pressable>
              </View>
            </View>

            <View style={styles.locationHeader}>
              <View style={styles.configCopy}>
                <Text
                  style={[styles.configTitle, { color: colors.foreground }]}
                >
                  Allowed locations
                </Text>
                <Text
                  style={[styles.configText, { color: colors.mutedForeground }]}
                >
                  People must have one of these profile locations to join.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.locationComposer,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.locationInput, { color: colors.foreground }]}
                placeholder="Add location, e.g. Lilongwe"
                placeholderTextColor={colors.mutedForeground}
                value={locationInput}
                onChangeText={(text) => {
                  setLocationInput(text);
                  setError("");
                }}
                onSubmitEditing={addAllowedLocation}
                returnKeyType="done"
              />
              <Pressable
                onPress={addAllowedLocation}
                style={[
                  styles.addLocationBtn,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.addLocationBtnText}>Add</Text>
              </Pressable>
            </View>

            {locationSuggestions.length > 0 && (
              <View style={styles.suggestionWrap}>
                {locationSuggestions.map((location) => {
                  const active = allowedLocations.some(
                    (item) =>
                      normalizeLocation(item) === normalizeLocation(location),
                  );
                  return (
                    <Pressable
                      key={location}
                      onPress={() => {
                        if (active) {
                          removeAllowedLocation(location);
                        } else {
                          setAllowedLocations((prev) => [...prev, location]);
                        }
                        setError("");
                      }}
                      style={[
                        styles.suggestionChip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.muted,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.suggestionText,
                          { color: active ? "#FFF" : colors.foreground },
                        ]}
                      >
                        {location}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {allowedLocations.length > 0 && (
              <View style={styles.locationList}>
                {allowedLocations.map((location) => (
                  <Pressable
                    key={location}
                    onPress={() => removeAllowedLocation(location)}
                    style={[
                      styles.locationChip,
                      {
                        backgroundColor: colors.primary + "10",
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.locationChipText,
                        { color: colors.foreground },
                      ]}
                    >
                      {location}
                    </Text>
                    <Ionicons
                      name="close"
                      size={14}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.mutedForeground }]}
          >
            {groupMode === "anonymous" ? "INVITE PEOPLE" : "ADD MEMBERS"}
          </Text>
        </View>

        {friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="people-outline"
              size={48}
              color={colors.mutedForeground}
            />
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
                paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20,
              },
            ]}
            renderItem={({ item }: { item: AppUser }) => {
              const isSelected = selected.has(item.id);
              const isLocationAllowedForAnonymous =
                groupMode !== "anonymous" ||
                !item.location ||
                allowedLocations.some(
                  (location) =>
                    normalizeLocation(location) ===
                    normalizeLocation(item.location),
                );

              return (
                <Pressable
                  onPress={() => {
                    if (
                      groupMode === "anonymous" &&
                      !isLocationAllowedForAnonymous
                    ) {
                      setError(
                        "This person does not match the allowed locations.",
                      );
                      return;
                    }
                    toggleMember(item.id);
                  }}
                  style={({ pressed }) => [
                    styles.friendRow,
                    {
                      backgroundColor: pressed
                        ? colors.muted
                        : isSelected
                          ? colors.primary + "0D"
                          : colors.background,
                      opacity:
                        groupMode === "anonymous" &&
                        !isLocationAllowedForAnonymous
                          ? 0.45
                          : 1,
                    },
                  ]}
                >
                  <UserAvatar
                    displayName={item.displayName}
                    avatarColor={item.avatarColor}
                    size={48}
                  />
                  <View style={styles.friendInfo}>
                    <Text
                      style={[styles.friendName, { color: colors.foreground }]}
                    >
                      {item.displayName}
                    </Text>
                    <Text
                      style={[
                        styles.friendHandle,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      @{item.username}
                    </Text>
                    {groupMode === "anonymous" && item.location ? (
                      <Text
                        style={[
                          styles.friendLocation,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {item.location}
                      </Text>
                    ) : null}
                  </View>
                  {groupMode === "anonymous" &&
                  !isLocationAllowedForAnonymous ? (
                    <View
                      style={[
                        styles.locationPill,
                        { backgroundColor: colors.muted },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={12}
                        color={colors.mutedForeground}
                      />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : "transparent",
                          borderColor: isSelected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      )}
                    </View>
                  )}
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
  headerTitleWrap: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  createBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modeSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  modeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTextWrap: { flex: 1, gap: 2 },
  modeTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  modeText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
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
  nameInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  noticeCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  noticeText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  errorText: {
    paddingHorizontal: 16,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    marginBottom: 8,
  },
  selectedRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    gap: 10,
  },
  selectedSummary: {
    paddingHorizontal: 16,
    gap: 2,
  },
  selectedTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  selectedSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
  configCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  configRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  configCopy: { flex: 1, gap: 2 },
  configTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  configText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    minWidth: 32,
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  locationHeader: {
    marginTop: 2,
  },
  locationComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  addLocationBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  addLocationBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  locationList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
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
  friendLocation: { fontSize: 12, fontFamily: "Inter_400Regular" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  locationPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  backToChatsText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
