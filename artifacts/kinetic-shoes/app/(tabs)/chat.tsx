import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import { FriendRequestCard } from "@/components/chat/FriendRequestCard";
import { ConversationRow } from "@/components/chat/ConversationRow";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { useChat, type AppUser } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

const AVATAR_COLORS = [
  "#13B734", "#FF6B6B", "#4ECDC4", "#FFD93D",
  "#A29BFE", "#FD79A8", "#00B894", "#E17055",
];

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// SetupScreen removed because profiles are auto-generated from signup

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
      if (!q.trim()) { setResults([]); return; }
      searchUsers(q).then((found) => setResults(found)).catch(() => {});
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
                <Pressable
                  style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}
                  onPress={() => {
                    handleClose();
                    router.push(`/profile/${item.id}`);
                  }}
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
                </Pressable>
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
    conversations,
    getLastMessage,
    getUser,
    getOrCreateDirectConversation,
    ensureDirectConversation,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getPendingReceivedRequests,
    getPendingSentRequests,
    getUnreadCount,
    getConversationUnreadCount,
    markConversationAsRead,
    getActiveStories,
  } = useChat();

  const [activeTab, setActiveTab] = useState<TabKey>("chats");
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterText, setFilterText] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!isLoaded || !currentUser) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
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

  const unreadCount = getUnreadCount();
  const activeStories = getActiveStories();
  
  // Convert grouped stories to an array for the ribbon
  const storyUsers = Object.keys(activeStories).map(userId => {
    const user = getUser(userId);
    return {
      userId,
      user,
      stories: activeStories[userId],
      hasUnseen: activeStories[userId].some(s => !s.viewers.includes(currentUser.id))
    };
  }).filter(u => u.user); // Ensure user exists

  // Put users with unseen stories first, then others
  storyUsers.sort((a, b) => {
    if (a.hasUnseen && !b.hasUnseen) return -1;
    if (!a.hasUnseen && b.hasUnseen) return 1;
    return b.stories[b.stories.length - 1].createdAt - a.stories[a.stories.length - 1].createdAt;
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Premium Glass Header */}
      <BlurView
        intensity={80}
        tint={colors.background === "#FFFFFF" ? "light" : "dark"}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <View style={[styles.onlineDot, { backgroundColor: "#22C55E" }]} />
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>@{currentUser.username}</Text>
              {unreadCount > 0 && (
                <View style={[styles.unreadPill, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadPillText}>{unreadCount}</Text>
                </View>
              )}
            </View>
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

        {activeTab === "chats" && (
          <View style={[styles.filterBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.filterInput, { color: colors.foreground }]}
              placeholder="Search conversations…"
              placeholderTextColor={colors.mutedForeground}
              value={filterText}
              onChangeText={setFilterText}
            />
            {filterText.length > 0 && (
              <Pressable onPress={() => setFilterText("")}>
                <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        )}

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
                <Text style={[styles.tabText, { color: active ? colors.primary : colors.mutedForeground }]}>
                  {label}
                </Text>
                {badge && (
                  <View style={[styles.tabBadge, { backgroundColor: "#EF4444" }]}>
                    <Text style={styles.tabBadgeText}>{badge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </BlurView>

      {/* Content */}
      {activeTab === "chats" && (
        <FlatList
          data={myConversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 },
          ]}
          renderItem={({ item, index }) => {
            const lastMsg = getLastMessage(item.id);
            const lastSender = lastMsg ? getUser(lastMsg.senderId) : undefined;
            const lastText = lastMsg
              ? lastMsg.type === "voice" ? "Voice message"
              : lastMsg.type === "image" ? "Photo"
              : lastMsg.type === "video" ? "Video"
              : lastMsg.type === "file" ? `${lastMsg.fileName ?? "File"}`
              : lastMsg.type === "sticker" ? `${lastMsg.sticker ?? "Sticker"} Sticker`
              : lastMsg.type === "contact" ? `Contact: ${lastMsg.contact?.displayName ?? "Shared contact"}`
              : lastMsg.senderId === currentUser.id
                ? `You: ${lastMsg.text}`
                : item.type === "group"
                ? `${lastSender?.displayName.split(" ")[0]}: ${lastMsg.text}`
                : lastMsg.text
              : undefined;
            const unread = getConversationUnreadCount(item.id);
            return (
              <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <Pressable
                  style={({ pressed }) => [styles.convRow, { backgroundColor: pressed ? colors.muted : colors.background }]}
                  onPress={() => { markConversationAsRead(item.id); router.push(`/chat/${item.id}`); }}
                >
                  <View style={{ position: "relative" }}>
                    <UserAvatar displayName={getConvName(item.id)} avatarColor={getConvColor(item.id)} size={52} />
                    {/* Online dot for bots */}
                    {item.type === "direct" && (
                      <View style={[styles.presenceDot, { backgroundColor: "#22C55E", borderColor: colors.background }]} />
                    )}
                  </View>
                  <View style={styles.convInfo}>
                    <View style={styles.convTopRow}>
                      <Text style={[styles.convName, { color: colors.foreground }]} numberOfLines={1}>{getConvName(item.id)}</Text>
                      <Text style={[styles.convTime, { color: unread > 0 ? colors.primary : colors.mutedForeground }]}>
                        {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </Text>
                    </View>
                    <View style={styles.convBottomRow}>
                      <Text style={[styles.convLastMsg, { color: unread > 0 ? colors.foreground : colors.mutedForeground, fontFamily: unread > 0 ? "Inter_600SemiBold" : "Inter_400Regular" }]} numberOfLines={1}>
                        {lastText ?? "Start a conversation…"}
                      </Text>
                      {unread > 0 && (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.unreadBadgeText}>{unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border, marginLeft: 84 }]} />}
          ListHeaderComponent={
            <View style={styles.storiesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
                {/* My Story Node */}
                <Pressable 
                  style={styles.storyNode}
                  onPress={() => {
                    const myStories = activeStories[currentUser.id];
                    if (myStories && myStories.length > 0) {
                      router.push(`/chat/story/${currentUser.id}`);
                    } else {
                      router.push("/chat/create-story");
                    }
                  }}
                >
                  <View style={[styles.storyRing, { borderColor: colors.border }]}>
                    <UserAvatar displayName={currentUser.displayName} avatarColor={currentUser.avatarColor} size={56} />
                    <View style={[styles.addStoryBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                      <Ionicons name="add" size={12} color="#FFF" />
                    </View>
                  </View>
                  <Text style={[styles.storyName, { color: colors.foreground }]} numberOfLines={1}>Your Story</Text>
                </Pressable>

                {/* Friend Stories */}
                {storyUsers.map((su, idx) => (
                  <Animated.View key={su.userId} entering={FadeInRight.delay(idx * 50).springify()}>
                    <Pressable 
                      style={styles.storyNode}
                      onPress={() => router.push(`/chat/story/${su.userId}`)}
                    >
                      <View style={[styles.storyRing, { borderColor: su.hasUnseen ? colors.primary : colors.border }]}>
                        <UserAvatar displayName={su.user!.displayName} avatarColor={su.user!.avatarColor} size={56} />
                      </View>
                      <Text style={[styles.storyName, { color: colors.foreground, fontFamily: su.hasUnseen ? "Inter_600SemiBold" : "Inter_400Regular" }]} numberOfLines={1}>
                        {su.user!.displayName.split(" ")[0]}
                      </Text>
                    </Pressable>
                  </Animated.View>
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={56} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No conversations yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add friends and start chatting</Text>
              <Pressable onPress={() => setSearchVisible(true)} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
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
                <View
                  key={friend.id}
                  style={[
                    styles.friendRow,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Pressable
                    style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}
                    onPress={() => router.push(`/profile/${friend.id}`)}
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
                  </Pressable>
                  <Pressable 
                    onPress={async () => {
                      const convId = await ensureDirectConversation(friend.id);
                      if (convId) router.push(`/chat/${convId}`);
                    }}
                    style={({ pressed }) => [
                      styles.msgBtn, 
                      { backgroundColor: pressed ? colors.primary + "30" : colors.primary + "15" }
                    ]}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                  </Pressable>
                </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  unreadPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  unreadPillText: { color: "#FFF", fontSize: 10, fontFamily: "Inter_700Bold" },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
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
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  tabBadge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { color: "#FFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  listContent: { paddingTop: 4 },
  separator: { height: StyleSheet.hairlineWidth },
  // Conversation row
  convRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  presenceDot: { position: "absolute", bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
  convInfo: { flex: 1 },
  convTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  convName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  convTime: { fontSize: 11, fontFamily: "Inter_500Medium" },
  convBottomRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  convLastMsg: { flex: 1, fontSize: 13, lineHeight: 18 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadBadgeText: { color: "#FFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  // Stories
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  storiesScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyNode: {
    alignItems: "center",
    width: 64,
  },
  storyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  addStoryBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  storyName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
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
