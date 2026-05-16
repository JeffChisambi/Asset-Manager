import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FriendRequestCard } from "@/components/chat/FriendRequestCard";
import { ConversationRow } from "@/components/chat/ConversationRow";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { SEED_USERS, useChat, type AppUser } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

const AVATAR_COLORS = [
  "#4A80F0", "#FF6B6B", "#4ECDC4", "#FFD93D",
  "#A29BFE", "#FD79A8", "#00B894", "#E17055",
];

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setCurrentUser } = useChat();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    const dn = displayName.trim();
    const un = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!dn || dn.length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }
    if (!un || un.length < 3) {
      setError("Username must be at least 3 characters (letters, numbers, _).");
      return;
    }
    if (SEED_USERS.some((u) => u.username === un)) {
      setError("That username is taken. Try another.");
      return;
    }
    const user: AppUser = {
      id: "me_" + Date.now(),
      username: un,
      displayName: dn,
      avatarColor: randomColor(),
      bio: "Sneaker enthusiast",
      isBot: false,
    };
    setCurrentUser(user);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View
        style={[
          styles.setupRoot,
          {
            backgroundColor: colors.background,
            paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 20,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20,
          },
        ]}
      >
        <View style={styles.setupContent}>
          <View style={[styles.setupIcon, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="chatbubbles" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.setupTitle, { color: colors.foreground }]}>
            Set up your profile
          </Text>
          <Text style={[styles.setupSub, { color: colors.mutedForeground }]}>
            Choose a username to start finding friends and chatting about sneakers.
          </Text>

          <View style={styles.setupFields}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Display Name
              </Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
                ]}
                placeholder="e.g. Jordan Lee"
                placeholderTextColor={colors.mutedForeground}
                value={displayName}
                onChangeText={(t) => { setDisplayName(t); setError(""); }}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Username
              </Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
                ]}
                placeholder="e.g. sneakerking"
                placeholderTextColor={colors.mutedForeground}
                value={username}
                onChangeText={(t) => { setUsername(t); setError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {!!error && (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {error}
              </Text>
            )}
          </View>

          <Pressable
            onPress={handleCreate}
            style={[styles.setupBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.setupBtnText}>Get Started</Text>
          </Pressable>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

function UserSearchModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { searchUsers, sendFriendRequest, isFriend, hasPendingRequest } = useChat();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppUser[]>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      setResults(searchUsers(q));
    },
    [searchUsers]
  );

  const handleSend = (userId: string) => {
    sendFriendRequest(userId);
    setSent((prev) => new Set([...prev, userId]));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSent(new Set());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.modalRoot,
          {
            backgroundColor: colors.background,
            paddingTop: Platform.OS === "web" ? 20 : insets.top + 8,
          },
        ]}
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Find People
          </Text>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by username…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={handleSearch}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!query && (
            <Pressable onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {!query && (
          <View style={styles.searchHint}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Search for sneaker fans by username
            </Text>
          </View>
        )}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.searchResults}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const alreadyFriend = isFriend(item.id);
            const pending = hasPendingRequest(item.id) || sent.has(item.id);
            return (
              <View
                style={[
                  styles.userRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <UserAvatar
                  displayName={item.displayName}
                  avatarColor={item.avatarColor}
                  size={48}
                />
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>
                    {item.displayName}
                  </Text>
                  <Text style={[styles.userHandle, { color: colors.mutedForeground }]}>
                    @{item.username}
                  </Text>
                  {!!item.bio && (
                    <Text style={[styles.userBio, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.bio}
                    </Text>
                  )}
                </View>
                {alreadyFriend ? (
                  <View style={[styles.friendBadge, { backgroundColor: colors.primary + "18" }]}>
                    <Text style={[styles.friendBadgeText, { color: colors.primary }]}>
                      Friends
                    </Text>
                  </View>
                ) : pending ? (
                  <View style={[styles.friendBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.friendBadgeText, { color: colors.mutedForeground }]}>
                      Pending
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleSend(item.id)}
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="person-add" size={14} color="#FFF" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            query ? (
              <View style={styles.searchHint}>
                <Ionicons name="search-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                  No users found for "{query}"
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </Modal>
  );
}

type TabKey = "chats" | "friends";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    isLoaded,
    friends,
    friendRequests,
    conversations,
    getLastMessage,
    getUser,
    getOrCreateDirectConversation,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getPendingReceivedRequests,
    getPendingSentRequests,
  } = useChat();

  const [activeTab, setActiveTab] = useState<TabKey>("chats");
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterText, setFilterText] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!isLoaded) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!currentUser) {
    return <SetupScreen />;
  }

  const pendingReceived = getPendingReceivedRequests();
  const pendingSent = getPendingSentRequests();
  const friendsCount = friends.length;
  const requestCount = pendingReceived.length;

  const myConversations = conversations
    .filter((c) =>
      c.memberIds.includes(currentUser.id) &&
      (filterText
        ? (c.type === "group"
          ? c.name?.toLowerCase().includes(filterText.toLowerCase())
          : getUser(c.memberIds.find((id) => id !== currentUser.id) ?? "")
              ?.displayName.toLowerCase()
              .includes(filterText.toLowerCase()))
        : true)
    )
    .sort((a, b) => {
      const lastA = getLastMessage(a.id)?.timestamp ?? a.createdAt;
      const lastB = getLastMessage(b.id)?.timestamp ?? b.createdAt;
      return lastB - lastA;
    });

  const getConvName = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return "";
    if (conv.type === "group") return conv.name ?? "Group";
    const otherId = conv.memberIds.find((id) => id !== currentUser.id) ?? "";
    return getUser(otherId)?.displayName ?? "Unknown";
  };

  const getConvColor = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return colors.primary;
    if (conv.type === "group") return colors.primary;
    const otherId = conv.memberIds.find((id) => id !== currentUser.id) ?? "";
    return getUser(otherId)?.avatarColor ?? colors.primary;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Messages
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              @{currentUser.username}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setSearchVisible(true)}
              style={[styles.headerIconBtn, { backgroundColor: colors.muted }]}
            >
              <Feather name="user-plus" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/chat/new-group")}
              style={[styles.headerIconBtn, { backgroundColor: colors.muted }]}
            >
              <Ionicons name="people-outline" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {/* Search conversations */}
        {activeTab === "chats" && (
          <View style={[styles.filterBar, { backgroundColor: colors.muted }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.filterInput, { color: colors.foreground }]}
              placeholder="Search conversations…"
              placeholderTextColor={colors.mutedForeground}
              value={filterText}
              onChangeText={setFilterText}
            />
          </View>
        )}

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {(["chats", "friends"] as TabKey[]).map((tab) => {
            const active = activeTab === tab;
            const label = tab === "chats" ? "Chats" : "Friends";
            const badge = tab === "friends" && requestCount > 0 ? requestCount : null;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, active && [styles.tabActive, { borderBottomColor: colors.primary }]]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {label}
                </Text>
                {badge && (
                  <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.tabBadgeText}>{badge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content */}
      {activeTab === "chats" && (
        <FlatList
          data={myConversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 },
          ]}
          renderItem={({ item }) => {
            const lastMsg = getLastMessage(item.id);
            const lastSender = lastMsg ? getUser(lastMsg.senderId) : undefined;
            const lastText = lastMsg
              ? lastMsg.senderId === currentUser.id
                ? `You: ${lastMsg.text}`
                : item.type === "group"
                ? `${lastSender?.displayName.split(" ")[0]}: ${lastMsg.text}`
                : lastMsg.text
              : undefined;
            return (
              <ConversationRow
                name={getConvName(item.id)}
                avatarColor={getConvColor(item.id)}
                lastMessage={lastText}
                lastTime={lastMsg?.timestamp ?? item.createdAt}
                isGroup={item.type === "group"}
                memberCount={item.memberIds.length}
                onPress={() => router.push(`/chat/${item.id}`)}
              />
            );
          }}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={52} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No conversations yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Add friends and start chatting about sneakers
              </Text>
              <Pressable
                onPress={() => setSearchVisible(true)}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="person-add-outline" size={16} color="#FFF" />
                <Text style={styles.emptyBtnText}>Find People</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {activeTab === "friends" && (
        <ScrollView
          contentContainerStyle={[
            styles.friendsContent,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {pendingReceived.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                Friend Requests ({pendingReceived.length})
              </Text>
              {pendingReceived.map((req) => {
                const user = getUser(req.fromId);
                if (!user) return null;
                return (
                  <FriendRequestCard
                    key={req.id}
                    user={user}
                    type="received"
                    onAccept={() => {
                      acceptFriendRequest(req.id);
                      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    onReject={() => rejectFriendRequest(req.id)}
                  />
                );
              })}
            </View>
          )}

          {pendingSent.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                Sent Requests ({pendingSent.length})
              </Text>
              {pendingSent.map((req) => {
                const user = getUser(req.toId);
                if (!user) return null;
                return (
                  <FriendRequestCard
                    key={req.id}
                    user={user}
                    type="sent"
                    onCancel={() => cancelFriendRequest(req.id)}
                  />
                );
              })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              Friends ({friendsCount})
            </Text>
            {friends.length === 0 ? (
              <View style={styles.friendsEmpty}>
                <Ionicons name="people-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.friendsEmptyText, { color: colors.mutedForeground }]}>
                  No friends yet. Search for people to connect!
                </Text>
                <Pressable
                  onPress={() => setSearchVisible(true)}
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="search-outline" size={16} color="#FFF" />
                  <Text style={styles.emptyBtnText}>Find People</Text>
                </Pressable>
              </View>
            ) : (
              friends.map((friend) => (
                <Pressable
                  key={friend.id}
                  onPress={() => {
                    const convId = getOrCreateDirectConversation(friend.id);
                    if (convId) router.push(`/chat/${convId}`);
                  }}
                  style={({ pressed }) => [
                    styles.friendRow,
                    {
                      backgroundColor: pressed ? colors.muted : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <UserAvatar
                    displayName={friend.displayName}
                    avatarColor={friend.avatarColor}
                    size={48}
                  />
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: colors.foreground }]}>
                      {friend.displayName}
                    </Text>
                    <Text style={[styles.friendHandle, { color: colors.mutedForeground }]}>
                      @{friend.username}
                    </Text>
                    {!!friend.bio && (
                      <Text style={[styles.friendBio, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {friend.bio}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.msgBtn, { backgroundColor: colors.primary + "15" }]}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <UserSearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginBottom: 12,
  },
  filterInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  tabBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  listContent: { paddingTop: 4 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 80 },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 100,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  friendsContent: { paddingTop: 12, gap: 4 },
  section: { gap: 8, marginBottom: 8 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 16,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  friendInfo: { flex: 1, gap: 2 },
  friendName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  friendHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  friendBio: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  msgBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  friendsEmpty: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 10,
  },
  friendsEmptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  // Setup screen
  setupRoot: { flex: 1, paddingHorizontal: 24 },
  setupContent: { flex: 1, justifyContent: "center", gap: 20, paddingBottom: 40 },
  setupIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  setupTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  setupSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  setupFields: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fieldInput: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  setupBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  setupBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  // Modal
  modalRoot: { flex: 1, paddingHorizontal: 16 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  searchHint: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  hintText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  searchResults: { gap: 8, paddingBottom: 40 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  userBio: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  friendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  friendBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  addBtnText: { color: "#FFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
