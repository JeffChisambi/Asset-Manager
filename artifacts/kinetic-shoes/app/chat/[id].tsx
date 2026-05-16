import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
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
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { useChat, type AppUser } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

function GroupInfoModal({
  visible,
  conversationId,
  onClose,
}: {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    friends,
    getConversation,
    getUser,
    addGroupMember,
    removeGroupMember,
  } = useChat();

  const conv = getConversation(conversationId);
  const members: AppUser[] = (conv?.memberIds ?? [])
    .map((id) => getUser(id))
    .filter((u): u is AppUser => !!u);

  const nonMembers = friends.filter(
    (f) => !conv?.memberIds.includes(f.id)
  );

  const isAdmin = conv?.createdBy === currentUser?.id;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.groupModal,
          {
            backgroundColor: colors.background,
            paddingTop: Platform.OS === "web" ? 24 : insets.top + 12,
          },
        ]}
      >
        <View style={styles.groupModalHeader}>
          <Text style={[styles.groupModalTitle, { color: colors.foreground }]}>
            Group Info
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        >
          {/* Group Avatar */}
          <View style={styles.groupAvatarSection}>
            <View style={[styles.groupAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.groupAvatarText}>
                {(conv?.name ?? "G").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.groupName, { color: colors.foreground }]}>
              {conv?.name ?? "Group Chat"}
            </Text>
            <Text style={[styles.groupMemberCount, { color: colors.mutedForeground }]}>
              {members.length} members
            </Text>
          </View>

          {/* Members */}
          <View style={styles.groupSection}>
            <Text style={[styles.groupSectionLabel, { color: colors.mutedForeground }]}>
              MEMBERS
            </Text>
            {members.map((member) => (
              <View
                key={member.id}
                style={[
                  styles.memberRow,
                  { borderBottomColor: colors.border },
                ]}
              >
                <UserAvatar
                  displayName={member.displayName}
                  avatarColor={member.avatarColor}
                  size={42}
                />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>
                    {member.displayName}
                    {member.id === currentUser?.id ? " (You)" : ""}
                    {member.id === conv?.createdBy ? " · Admin" : ""}
                  </Text>
                  <Text style={[styles.memberHandle, { color: colors.mutedForeground }]}>
                    @{member.username}
                  </Text>
                </View>
                {isAdmin && member.id !== currentUser?.id && (
                  <Pressable
                    onPress={() => removeGroupMember(conversationId, member.id)}
                    hitSlop={8}
                  >
                    <Ionicons name="remove-circle-outline" size={22} color={colors.destructive} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          {/* Add members */}
          {isAdmin && nonMembers.length > 0 && (
            <View style={styles.groupSection}>
              <Text style={[styles.groupSectionLabel, { color: colors.mutedForeground }]}>
                ADD MEMBERS
              </Text>
              {nonMembers.map((friend) => (
                <View
                  key={friend.id}
                  style={[styles.memberRow, { borderBottomColor: colors.border }]}
                >
                  <UserAvatar
                    displayName={friend.displayName}
                    avatarColor={friend.avatarColor}
                    size={42}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.foreground }]}>
                      {friend.displayName}
                    </Text>
                    <Text style={[styles.memberHandle, { color: colors.mutedForeground }]}>
                      @{friend.username}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => addGroupMember(conversationId, friend.id)}
                    style={[styles.addMemberBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={16} color="#FFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, getConversation, getConversationMessages, getUser, sendMessage } =
    useChat();

  const [inputText, setInputText] = useState("");
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const conv = getConversation(id ?? "");
  const rawMessages = getConversationMessages(id ?? "");

  const displayMessages = useMemo(
    () => [...rawMessages].reverse(),
    [rawMessages]
  );

  const isGroup = conv?.type === "group";

  const getConvTitle = () => {
    if (!conv || !currentUser) return "";
    if (isGroup) return conv.name ?? "Group Chat";
    const otherId = conv.memberIds.find((mid) => mid !== currentUser.id) ?? "";
    return getUser(otherId)?.displayName ?? "Unknown";
  };

  const getConvSubtitle = () => {
    if (!conv || !currentUser) return "";
    if (isGroup) return `${conv.memberIds.length} members`;
    const otherId = conv.memberIds.find((mid) => mid !== currentUser.id) ?? "";
    return `@${getUser(otherId)?.username ?? ""}`;
  };

  const getConvAvatarColor = () => {
    if (!conv || !currentUser) return colors.primary;
    if (isGroup) return colors.primary;
    const otherId = conv.memberIds.find((mid) => mid !== currentUser.id) ?? "";
    return getUser(otherId)?.avatarColor ?? colors.primary;
  };

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !id) return;
    sendMessage(id, inputText.trim());
    setInputText("");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [inputText, id, sendMessage]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!conv) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { paddingTop: topPad + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.convTitle, { color: colors.foreground }]}>
            Conversation not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <UserAvatar
          displayName={getConvTitle()}
          avatarColor={getConvAvatarColor()}
          size={38}
        />
        <View style={styles.headerTitleBlock}>
          <Text
            style={[styles.convTitle, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {getConvTitle()}
          </Text>
          <Text style={[styles.convSubtitle, { color: colors.mutedForeground }]}>
            {getConvSubtitle()}
          </Text>
        </View>
        {isGroup && (
          <Pressable
            onPress={() => setGroupInfoVisible(true)}
            hitSlop={8}
            style={styles.headerAction}
          >
            <Ionicons name="people-outline" size={22} color={colors.foreground} />
          </Pressable>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item, index }) => {
          const isMine = item.senderId === currentUser?.id;
          const sender = getUser(item.senderId);
          const prevMsg = displayMessages[index + 1];
          const showSender =
            isGroup &&
            !isMine &&
            (!prevMsg || prevMsg.senderId !== item.senderId);
          return (
            <MessageBubble
              text={item.text}
              isMine={isMine}
              senderName={sender?.displayName}
              senderColor={sender?.avatarColor}
              timestamp={item.timestamp}
              showSender={showSender}
            />
          );
        }}
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: 12, paddingTop: 8 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyConv}>
            <UserAvatar
              displayName={getConvTitle()}
              avatarColor={getConvAvatarColor()}
              size={64}
            />
            <Text style={[styles.emptyConvName, { color: colors.foreground }]}>
              {getConvTitle()}
            </Text>
            <Text style={[styles.emptyConvText, { color: colors.mutedForeground }]}>
              {isGroup
                ? "Group created! Say hello to everyone 👋"
                : "Say hi to start the conversation!"}
            </Text>
          </View>
        }
      />

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 4,
          },
        ]}
      >
        <View style={[styles.inputWrap, { backgroundColor: colors.muted }]}>
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="Message…"
            placeholderTextColor={colors.mutedForeground}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            onSubmitEditing={Platform.OS === "web" ? handleSend : undefined}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim()}
          style={[
            styles.sendBtn,
            {
              backgroundColor: inputText.trim() ? colors.primary : colors.muted,
            },
          ]}
        >
          <Ionicons
            name="send"
            size={18}
            color={inputText.trim() ? "#FFF" : colors.mutedForeground}
          />
        </Pressable>
      </View>

      <GroupInfoModal
        visible={groupInfoVisible}
        conversationId={id ?? ""}
        onClose={() => setGroupInfoVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitleBlock: { flex: 1, gap: 1 },
  convTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  convSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  headerAction: { padding: 4 },
  messagesList: { flexGrow: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
  },
  textInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyConv: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 80,
    paddingHorizontal: 32,
    transform: [{ scaleY: -1 }],
  },
  emptyConvName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  emptyConvText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  // Group modal
  groupModal: { flex: 1, paddingHorizontal: 16 },
  groupModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  groupModalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  groupAvatarSection: {
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  groupAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  groupAvatarText: {
    color: "#FFF",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  groupName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  groupMemberCount: { fontSize: 14, fontFamily: "Inter_400Regular" },
  groupSection: { marginBottom: 20, gap: 4 },
  groupSectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  memberHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addMemberBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
