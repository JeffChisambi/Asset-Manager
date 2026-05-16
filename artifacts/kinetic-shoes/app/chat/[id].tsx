import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FileMessageBubble } from "@/components/chat/FileMessageBubble";
import { ImageMessageBubble } from "@/components/chat/ImageMessageBubble";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { VoiceMessageBubble } from "@/components/chat/VoiceMessageBubble";
import { useChat, type AppUser, type Message } from "@/context/ChatContext";
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
  const { currentUser, friends, getConversation, getUser, addGroupMember, removeGroupMember } = useChat();

  const conv = getConversation(conversationId);
  const members: AppUser[] = (conv?.memberIds ?? []).map((id) => getUser(id)).filter((u): u is AppUser => !!u);
  const nonMembers = friends.filter((f) => !conv?.memberIds.includes(f.id));
  const isAdmin = conv?.createdBy === currentUser?.id;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.groupModal, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 24 : insets.top + 12 }]}>
        <View style={styles.groupModalHeader}>
          <Text style={[styles.groupModalTitle, { color: colors.foreground }]}>Group Info</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          <View style={styles.groupAvatarSection}>
            <View style={[styles.groupAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.groupAvatarText}>{(conv?.name ?? "G").slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={[styles.groupName, { color: colors.foreground }]}>{conv?.name ?? "Group Chat"}</Text>
            <Text style={[styles.groupMemberCount, { color: colors.mutedForeground }]}>{members.length} members</Text>
          </View>
          <View style={styles.groupSection}>
            <Text style={[styles.groupSectionLabel, { color: colors.mutedForeground }]}>MEMBERS</Text>
            {members.map((member) => (
              <View key={member.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                <UserAvatar displayName={member.displayName} avatarColor={member.avatarColor} size={42} />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>
                    {member.displayName}{member.id === currentUser?.id ? " (You)" : ""}{member.id === conv?.createdBy ? " · Admin" : ""}
                  </Text>
                  <Text style={[styles.memberHandle, { color: colors.mutedForeground }]}>@{member.username}</Text>
                </View>
                {isAdmin && member.id !== currentUser?.id && (
                  <Pressable onPress={() => removeGroupMember(conversationId, member.id)} hitSlop={8}>
                    <Ionicons name="remove-circle-outline" size={22} color={colors.destructive} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
          {isAdmin && nonMembers.length > 0 && (
            <View style={styles.groupSection}>
              <Text style={[styles.groupSectionLabel, { color: colors.mutedForeground }]}>ADD MEMBERS</Text>
              {nonMembers.map((friend) => (
                <View key={friend.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                  <UserAvatar displayName={friend.displayName} avatarColor={friend.avatarColor} size={42} />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.foreground }]}>{friend.displayName}</Text>
                    <Text style={[styles.memberHandle, { color: colors.mutedForeground }]}>@{friend.username}</Text>
                  </View>
                  <Pressable onPress={() => addGroupMember(conversationId, friend.id)} style={[styles.addMemberBtn, { backgroundColor: colors.primary }]}>
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

function AttachmentMenu({
  visible,
  onClose,
  onPickImage,
  onPickFile,
}: {
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onPickFile: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const options = [
    { label: "Photo & Video", icon: "image-outline" as const, color: "#4A80F0", onPress: onPickImage },
    { label: "Document", icon: "document-outline" as const, color: "#00B894", onPress: onPickFile },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.attachOverlay} onPress={onClose}>
        <View
          style={[
            styles.attachMenu,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              bottom: Platform.OS === "web" ? 100 : insets.bottom + 80,
            },
          ]}
        >
          {options.map((opt, i) => (
            <Pressable
              key={i}
              onPress={() => { opt.onPress(); onClose(); }}
              style={({ pressed }) => [
                styles.attachOption,
                { backgroundColor: pressed ? colors.muted : "transparent" },
                i < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.attachIcon, { backgroundColor: opt.color + "18" }]}>
                <Ionicons name={opt.icon} size={22} color={opt.color} />
              </View>
              <Text style={[styles.attachLabel, { color: colors.foreground }]}>{opt.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

function RecordingIndicator({
  duration,
  onCancel,
  onSend,
}: {
  duration: number;
  onCancel: () => void;
  onSend: () => void;
}) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const m = Math.floor(duration / 60);
  const s = duration % 60;
  const label = `${m}:${s.toString().padStart(2, "0")}`;

  return (
    <View style={[styles.recordingBar, { backgroundColor: colors.muted }]}>
      <Pressable onPress={onCancel} hitSlop={8} style={styles.cancelRec}>
        <Ionicons name="close" size={20} color={colors.mutedForeground} />
      </Pressable>
      <View style={styles.recIndicator}>
        <Animated.View style={[styles.recDot, { transform: [{ scale: pulseAnim }] }]} />
        <Text style={[styles.recTimer, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.recHint, { color: colors.mutedForeground }]}>Recording…</Text>
      </View>
      <Pressable onPress={onSend} style={[styles.sendRecBtn, { backgroundColor: colors.primary }]}>
        <Ionicons name="send" size={18} color="#FFF" />
      </Pressable>
    </View>
  );
}

function ChatMessageItem({
  message,
  currentUserId,
  isGroup,
  getUser,
}: {
  message: Message;
  currentUserId: string;
  isGroup: boolean;
  getUser: (id: string) => AppUser | undefined;
}) {
  const isMine = message.senderId === currentUserId;
  const sender = getUser(message.senderId);

  if (message.type === "voice" && message.audioUri) {
    return (
      <VoiceMessageBubble
        audioUri={message.audioUri}
        audioDuration={message.audioDuration ?? 0}
        isMine={isMine}
        timestamp={message.timestamp}
      />
    );
  }
  if (message.type === "image" && message.imageUri) {
    return (
      <ImageMessageBubble
        imageUri={message.imageUri}
        isMine={isMine}
        timestamp={message.timestamp}
      />
    );
  }
  if (message.type === "file" && message.fileName) {
    return (
      <FileMessageBubble
        fileName={message.fileName}
        fileSize={message.fileSize}
        fileMimeType={message.fileMimeType}
        isMine={isMine}
        timestamp={message.timestamp}
      />
    );
  }
  return (
    <MessageBubble
      text={message.text ?? ""}
      isMine={isMine}
      senderName={sender?.displayName}
      senderColor={sender?.avatarColor}
      timestamp={message.timestamp}
      showSender={isGroup && !isMine}
    />
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, getConversation, getConversationMessages, getUser, sendMessage, sendMediaMessage } = useChat();

  const [inputText, setInputText] = useState("");
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);
  const [attachVisible, setAttachVisible] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const conv = getConversation(id ?? "");
  const rawMessages = getConversationMessages(id ?? "");
  const displayMessages = useMemo(() => [...rawMessages].reverse(), [rawMessages]);
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

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    if (Platform.OS === "web") return;
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const cancelRecording = async () => {
    try {
      await recordingRef.current?.stopAndUnloadAsync();
    } catch {}
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const sendVoiceMessage = async () => {
    if (!recordingRef.current || !id) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      if (uri) {
        sendMediaMessage(id, { type: "voice", audioUri: uri, audioDuration: recordingDuration });
      }
    } catch {}
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0] && id) {
      sendMediaMessage(id, { type: "image", imageUri: result.assets[0].uri });
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0] && id) {
        const { uri, name, size, mimeType } = result.assets[0];
        sendMediaMessage(id, { type: "file", fileName: name, fileSize: size ?? 0, fileMimeType: mimeType ?? undefined });
      }
    } catch {}
  };

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !id) return;
    sendMessage(id, inputText.trim());
    setInputText("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [inputText, id, sendMessage]);

  const handleVoiceCall = () => router.push(`/call/voice?convId=${id}`);
  const handleVideoCall = () => router.push(`/call/video?convId=${id}`);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const memoizedGetUser = useCallback((uid: string) => getUser(uid), [getUser]);

  if (!conv) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { paddingTop: topPad + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.convTitle, { color: colors.foreground }]}>Not found</Text>
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
      <View style={[styles.headerBar, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <UserAvatar displayName={getConvTitle()} avatarColor={getConvAvatarColor()} size={38} />
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.convTitle, { color: colors.foreground }]} numberOfLines={1}>{getConvTitle()}</Text>
          <Text style={[styles.convSubtitle, { color: colors.mutedForeground }]}>{getConvSubtitle()}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={handleVoiceCall} hitSlop={8} style={styles.headerAction}>
            <Ionicons name="call-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable onPress={handleVideoCall} hitSlop={8} style={styles.headerAction}>
            <Ionicons name="videocam-outline" size={22} color={colors.primary} />
          </Pressable>
          {isGroup && (
            <Pressable onPress={() => setGroupInfoVisible(true)} hitSlop={8} style={styles.headerAction}>
              <Ionicons name="people-outline" size={22} color={colors.foreground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={displayMessages}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item }) => (
          <ChatMessageItem
            message={item}
            currentUserId={currentUser?.id ?? ""}
            isGroup={isGroup}
            getUser={memoizedGetUser}
          />
        )}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyConv}>
            <UserAvatar displayName={getConvTitle()} avatarColor={getConvAvatarColor()} size={64} />
            <Text style={[styles.emptyConvName, { color: colors.foreground }]}>{getConvTitle()}</Text>
            <Text style={[styles.emptyConvText, { color: colors.mutedForeground }]}>
              {isGroup ? "Group created! Say hello 👋" : "Say hi to start the conversation!"}
            </Text>
          </View>
        }
      />

      {/* Input Bar */}
      {isRecording ? (
        <RecordingIndicator
          duration={recordingDuration}
          onCancel={cancelRecording}
          onSend={sendVoiceMessage}
        />
      ) : (
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
          <Pressable onPress={() => setAttachVisible(true)} style={styles.inputIconBtn}>
            <Ionicons name="add-circle-outline" size={26} color={colors.mutedForeground} />
          </Pressable>

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

          {inputText.trim() ? (
            <Pressable onPress={handleSend} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="send" size={18} color="#FFF" />
            </Pressable>
          ) : (
            <Pressable
              onPress={Platform.OS === "web" ? undefined : startRecording}
              style={[styles.sendBtn, { backgroundColor: colors.muted }]}
            >
              <Ionicons name="mic" size={20} color={Platform.OS === "web" ? colors.border : colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      )}

      <AttachmentMenu
        visible={attachVisible}
        onClose={() => setAttachVisible(false)}
        onPickImage={pickImage}
        onPickFile={pickFile}
      />

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
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitleBlock: { flex: 1, gap: 1 },
  convTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  convSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerAction: { padding: 6 },
  messagesList: { flexGrow: 1, paddingVertical: 8 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputIconBtn: { padding: 4, marginBottom: 6 },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
  },
  textInput: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 20 },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
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
  emptyConvName: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 4 },
  emptyConvText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  // Recording bar
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  cancelRec: { padding: 4 },
  recIndicator: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444" },
  recTimer: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  recHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sendRecBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  // Attachment
  attachOverlay: { flex: 1, justifyContent: "flex-end" },
  attachMenu: {
    position: "absolute",
    left: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 220,
  },
  attachOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  attachIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  attachLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  // Group modal
  groupModal: { flex: 1, paddingHorizontal: 16 },
  groupModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingHorizontal: 4 },
  groupModalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  groupAvatarSection: { alignItems: "center", gap: 8, marginBottom: 24 },
  groupAvatar: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  groupAvatarText: { color: "#FFF", fontSize: 28, fontFamily: "Inter_700Bold" },
  groupName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  groupMemberCount: { fontSize: 14, fontFamily: "Inter_400Regular" },
  groupSection: { marginBottom: 20, gap: 4 },
  groupSectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, paddingHorizontal: 4, marginBottom: 4 },
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  memberHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addMemberBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
