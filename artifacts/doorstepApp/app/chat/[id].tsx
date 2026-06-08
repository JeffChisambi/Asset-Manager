import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { VideoMessageBubble } from "@/components/chat/VideoMessageBubble";
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
  const nonMembers = friends.filter((f) => !conv?.memberIds.includes(f.id));
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
          <View style={styles.groupAvatarSection}>
            <View
              style={[styles.groupAvatar, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.groupAvatarText}>
                {(conv?.name ?? "G").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.groupName, { color: colors.foreground }]}>
              {conv?.name ?? "Group Chat"}
            </Text>
            <Text
              style={[
                styles.groupMemberCount,
                { color: colors.mutedForeground },
              ]}
            >
              {members.length} members
            </Text>
          </View>
          <View style={styles.groupSection}>
            <Text
              style={[
                styles.groupSectionLabel,
                { color: colors.mutedForeground },
              ]}
            >
              MEMBERS
            </Text>
            {members.map((member) => (
              <View
                key={member.id}
                style={[styles.memberRow, { borderBottomColor: colors.border }]}
              >
                <Pressable
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                    gap: 12,
                  }}
                  onPress={() => {
                    onClose();
                    router.push(`/profile/${member.id}`);
                  }}
                >
                  <UserAvatar
                    displayName={member.displayName}
                    avatarColor={member.avatarColor}
                    size={42}
                  />
                  <View style={styles.memberInfo}>
                    <Text
                      style={[styles.memberName, { color: colors.foreground }]}
                    >
                      {member.displayName}
                      {member.id === currentUser?.id ? " (You)" : ""}
                      {member.id === conv?.createdBy ? " · Admin" : ""}
                    </Text>
                    <Text
                      style={[
                        styles.memberHandle,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      @{member.username}
                    </Text>
                  </View>
                </Pressable>
                {isAdmin && member.id !== currentUser?.id && (
                  <Pressable
                    onPress={() => removeGroupMember(conversationId, member.id)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="remove-circle-outline"
                      size={22}
                      color={colors.destructive}
                    />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
          {isAdmin && nonMembers.length > 0 && (
            <View style={styles.groupSection}>
              <Text
                style={[
                  styles.groupSectionLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                ADD MEMBERS
              </Text>
              {nonMembers.map((friend) => (
                <View
                  key={friend.id}
                  style={[
                    styles.memberRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Pressable
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                      gap: 12,
                    }}
                    onPress={() => {
                      onClose();
                      router.push(`/profile/${friend.id}`);
                    }}
                  >
                    <UserAvatar
                      displayName={friend.displayName}
                      avatarColor={friend.avatarColor}
                      size={42}
                    />
                    <View style={styles.memberInfo}>
                      <Text
                        style={[
                          styles.memberName,
                          { color: colors.foreground },
                        ]}
                      >
                        {friend.displayName}
                      </Text>
                      <Text
                        style={[
                          styles.memberHandle,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        @{friend.username}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => addGroupMember(conversationId, friend.id)}
                    style={[
                      styles.addMemberBtn,
                      { backgroundColor: colors.primary },
                    ]}
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

function AttachmentMenu({
  visible,
  onClose,
  onPickImage,
  onPickFile,
  onPickSticker,
  onPickContact,
}: {
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onPickFile: () => void;
  onPickSticker: () => void;
  onPickContact: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const options = [
    {
      label: "Photo & Video",
      icon: "image-outline" as const,
      color: "#13B734",
      onPress: onPickImage,
    },
    {
      label: "Document",
      icon: "document-outline" as const,
      color: "#00B894",
      onPress: onPickFile,
    },
    {
      label: "Sticker",
      icon: "happy-outline" as const,
      color: "#F7971E",
      onPress: onPickSticker,
    },
    {
      label: "Contact",
      icon: "person-circle-outline" as const,
      color: "#7C3AED",
      onPress: onPickContact,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
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
              onPress={() => {
                opt.onPress();
                onClose();
              }}
              style={({ pressed }) => [
                styles.attachOption,
                { backgroundColor: pressed ? colors.muted : "transparent" },
                i < options.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.attachIcon,
                  { backgroundColor: opt.color + "18" },
                ]}
              >
                <Ionicons name={opt.icon} size={22} color={opt.color} />
              </View>
              <Text style={[styles.attachLabel, { color: colors.foreground }]}>
                {opt.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

function RecordingIndicator({
  duration,
  bottomPadding,
  onCancel,
  onSend,
}: {
  duration: number;
  bottomPadding: number;
  onCancel: () => void;
  onSend: () => void;
}) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const m = Math.floor(duration / 60);
  const s = duration % 60;
  const label = `${m}:${s.toString().padStart(2, "0")}`;

  return (
    <View
      style={[
        styles.recordingBar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      <Pressable onPress={onCancel} hitSlop={8} style={styles.cancelRec}>
        <Ionicons name="close" size={20} color={colors.mutedForeground} />
      </Pressable>
      <View style={styles.recIndicator}>
        <Animated.View
          style={[styles.recDot, { transform: [{ scale: pulseAnim }] }]}
        />
        <Text style={[styles.recTimer, { color: colors.foreground }]}>
          {label}
        </Text>
        <Text style={[styles.recHint, { color: colors.mutedForeground }]}>
          Recording…
        </Text>
      </View>
      <Pressable
        onPress={onSend}
        style={[styles.sendRecBtn, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="send" size={18} color="#FFF" />
      </Pressable>
    </View>
  );
}

const STICKERS = [
  "😀",
  "😂",
  "😍",
  "🔥",
  "🎉",
  "🙏",
  "✅",
  "💚",
  "🛍️",
  "📦",
  "🚚",
  "⭐",
];

function StickerPickerModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (sticker: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.attachOverlay} onPress={onClose}>
        <View
          style={[
            styles.stickerSheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              bottom: Platform.OS === "web" ? 100 : insets.bottom + 80,
            },
          ]}
        >
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
            Send sticker
          </Text>
          <View style={styles.stickerGrid}>
            {STICKERS.map((sticker) => (
              <Pressable
                key={sticker}
                onPress={() => {
                  onPick(sticker);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.stickerBtn,
                  { backgroundColor: pressed ? colors.muted : "transparent" },
                ]}
              >
                <Text style={styles.stickerText}>{sticker}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function ContactPickerModal({
  visible,
  contacts,
  onClose,
  onPick,
}: {
  visible: boolean;
  contacts: AppUser[];
  onClose: () => void;
  onPick: (contact: AppUser) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.attachOverlay} onPress={onClose}>
        <View
          style={[
            styles.contactSheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              bottom: Platform.OS === "web" ? 100 : insets.bottom + 80,
            },
          ]}
        >
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
            Share contact
          </Text>
          {contacts.length === 0 ? (
            <Text
              style={[styles.emptySheetText, { color: colors.mutedForeground }]}
            >
              No contacts available to share yet.
            </Text>
          ) : (
            contacts.map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => {
                  onPick(contact);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.contactRow,
                  {
                    backgroundColor: pressed ? colors.muted : "transparent",
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <UserAvatar
                  displayName={contact.displayName}
                  avatarColor={contact.avatarColor}
                  size={38}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.contactName, { color: colors.foreground }]}
                  >
                    {contact.displayName}
                  </Text>
                  <Text
                    style={[
                      styles.contactHandle,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    @{contact.username}
                  </Text>
                </View>
                <Ionicons
                  name="send-outline"
                  size={18}
                  color={colors.primary}
                />
              </Pressable>
            ))
          )}
        </View>
      </Pressable>
    </Modal>
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
  const colors = useColors();
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
        status={message.status}
      />
    );
  }
  if (message.type === "video" && message.videoUri) {
    return (
      <VideoMessageBubble
        videoUri={message.videoUri}
        isMine={isMine}
        timestamp={message.timestamp}
        status={message.status}
      />
    );
  }
  if (message.type === "file" && message.fileName) {
    return (
      <FileMessageBubble
        fileUri={message.fileUri}
        fileName={message.fileName}
        fileSize={message.fileSize}
        fileMimeType={message.fileMimeType}
        isMine={isMine}
        timestamp={message.timestamp}
        status={message.status}
      />
    );
  }
  if (message.type === "sticker" && message.sticker) {
    return (
      <View
        style={[
          styles.stickerMessageRow,
          isMine ? styles.rowRight : styles.rowLeft,
        ]}
      >
        <View
          style={[
            styles.stickerMessage,
            {
              backgroundColor: isMine ? colors.primary + "22" : colors.muted,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={styles.stickerMessageText}>{message.sticker}</Text>
        </View>
      </View>
    );
  }
  if (message.type === "contact" && message.contact) {
    return (
      <View
        style={[
          styles.contactMessageRow,
          isMine ? styles.rowRight : styles.rowLeft,
        ]}
      >
        <View
          style={[
            styles.contactMessage,
            {
              backgroundColor: isMine ? colors.primary : colors.muted,
              borderColor: colors.border,
            },
          ]}
        >
          <UserAvatar
            displayName={message.contact.displayName}
            avatarColor={message.contact.avatarColor || colors.primary}
            size={42}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.contactMessageName,
                { color: isMine ? "#FFF" : colors.foreground },
              ]}
            >
              {message.contact.displayName}
            </Text>
            {!!message.contact.username && (
              <Text
                style={[
                  styles.contactMessageMeta,
                  {
                    color: isMine
                      ? "rgba(255,255,255,0.72)"
                      : colors.mutedForeground,
                  },
                ]}
              >
                @{message.contact.username}
              </Text>
            )}
          </View>
          <Ionicons
            name="person-add-outline"
            size={20}
            color={isMine ? "#FFF" : colors.primary}
          />
        </View>
      </View>
    );
  }
  return (
    <MessageBubble
      text={message.text ?? ""}
      isMine={isMine}
      senderName={sender?.displayName}
      senderDisplayName={sender?.displayName}
      senderColor={sender?.avatarColor}
      senderAvatarUrl={sender?.avatarUrl}
      timestamp={message.timestamp}
      showSender={isGroup && !isMine}
      showAvatar={!isMine}
    />
  );
}

const WALLPAPERS: Record<
  string,
  { bg: string; isGradient?: boolean; colors?: string[] }
> = {
  default: { bg: "transparent" },
  peach: { bg: "#FFF2EE" },
  lavender: { bg: "#F4EDFF" },
  stealth: { bg: "#16161A" },
  sunset: {
    bg: "transparent",
    isGradient: true,
    colors: ["#FF9966", "#FF5E62"],
  },
  neon: { bg: "transparent", isGradient: true, colors: ["#00F2FE", "#4FACFE"] },
  sneakers: { bg: "transparent" },
};

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    friends,
    allUsers,
    getConversation,
    getConversationMessages,
    getUser,
    sendMessage,
    sendMediaMessage,
  } = useChat();
  const [inputText, setInputText] = useState("");
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);
  const [attachVisible, setAttachVisible] = useState(false);
  const [stickerVisible, setStickerVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [wallpaper, setWallpaper] = useState<string>("default");

  useEffect(() => {
    AsyncStorage.getItem("chat_wallpaper").then((val) => {
      if (val) setWallpaper(val);
    });
  }, []);

  const conv = getConversation(id ?? "");
  const rawMessages = getConversationMessages(id ?? "");
  const displayMessages = useMemo(
    () => [...rawMessages],
    [rawMessages],
  );
  const isGroup = conv?.type === "group";
  const shareableContacts = useMemo(() => {
    const map = new Map<string, AppUser>();
    friends.forEach((friend) => map.set(friend.id, friend));
    allUsers.forEach((user) => {
      if (!map.has(user.id) && user.id !== currentUser?.id) {
        map.set(user.id, user);
      }
    });
    return Array.from(map.values());
  }, [friends, allUsers, currentUser]);

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

  const getConvAvatarUrl = () => {
    if (!conv || !currentUser || isGroup) return undefined;
    const otherId = conv.memberIds.find((mid) => mid !== currentUser.id) ?? "";
    return getUser(otherId)?.avatarUrl;
  };

  // Recording timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleStartRecording = async () => {
    if (Platform.OS === "web") return;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.record();
      setRecordingDuration(0);
      setIsRecording(true);
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.warn("Failed to start recording", err);
    }
  };

  const handleCancelRecording = async () => {
    try {
      await audioRecorder.stop();
    } catch {}
    setIsRecording(false);
    setRecordingDuration(0);
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSendRecording = async () => {
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = audioRecorder.uri;
      if (uri) {
        sendMediaMessage(id ?? "", {
          type: "voice",
          audioUri: uri,
          audioDuration: recordingDuration,
        });
      }
    } finally {
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!result.canceled && result.assets[0] && id) {
      const asset = result.assets[0];
      if (asset.type === "video") {
        sendMediaMessage(id, {
          type: "video",
          videoUri: asset.uri,
          fileName: asset.fileName || "video.mp4",
          fileSize: asset.fileSize,
          fileMimeType: asset.mimeType || "video/mp4",
        });
      } else {
        sendMediaMessage(id, { type: "image", imageUri: asset.uri });
      }
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0] && id) {
        const { uri, name, size, mimeType } = result.assets[0];
        sendMediaMessage(id, {
          type: "file",
          fileUri: uri,
          fileName: name,
          fileSize: size ?? 0,
          fileMimeType: mimeType ?? undefined,
        });
      }
    } catch {}
  };

  const sendSticker = (sticker: string) => {
    if (!id) return;
    sendMediaMessage(id, { type: "sticker", sticker });
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const sendContact = (contact: AppUser) => {
    if (!id) return;
    sendMediaMessage(id, {
      type: "contact",
      contact: {
        id: contact.id,
        displayName: contact.displayName,
        username: contact.username,
        avatarColor: contact.avatarColor,
      },
    });
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !id) return;
    sendMessage(id, inputText.trim());
    setInputText("");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [inputText, id, sendMessage]);

  const [typing, setTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = (text: string) => {
    setInputText(text);
    setTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTyping(false), 1200);
  };

  const handleVoiceCall = () => router.push(`/call/voice?convId=${id}`);
  const handleVideoCall = () => router.push(`/call/video?convId=${id}`);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const memoizedGetUser = useCallback((uid: string) => getUser(uid), [getUser]);

  if (!conv) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { paddingTop: topPad + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.convTitle, { color: colors.foreground }]}>
            Not found
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
      {/* Premium Header */}
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
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => {
            if (isGroup) {
              setGroupInfoVisible(true);
            } else {
              const otherId =
                conv.memberIds.find((mid) => mid !== currentUser?.id) ?? "";
              if (otherId) router.push(`/profile/${otherId}`);
            }
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            gap: 10,
          }}
        >
          <View style={{ position: "relative" }}>
            <UserAvatar
              displayName={getConvTitle()}
              avatarColor={getConvAvatarColor()}
              avatarUrl={getConvAvatarUrl()}
              size={40}
            />
            {!isGroup && false && (
              <View
                style={[
                  styles.onlineIndicator,
                  {
                    backgroundColor: "#22C55E",
                    borderColor: colors.background,
                  },
                ]}
              />
            )}
          </View>
          <View style={styles.headerTitleBlock}>
            <Text
              style={[styles.convTitle, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {getConvTitle()}
            </Text>
            {isGroup && (
              <Text style={[styles.convSubtitle, { color: colors.mutedForeground }]}>
                {conv.memberIds.length} members
              </Text>
            )}
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleVoiceCall}
            hitSlop={8}
            style={styles.headerAction}
          >
            <Ionicons name="call" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={handleVideoCall}
            hitSlop={8}
            style={styles.headerAction}
          >
            <Ionicons
              name="videocam"
              size={24}
              color={colors.primary}
            />
          </Pressable>
          {isGroup && (
            <Pressable
              onPress={() => setGroupInfoVisible(true)}
              hitSlop={8}
              style={styles.headerAction}
            >
              <Ionicons
                name="information-circle"
                size={24}
                color={colors.primary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Messages */}
      <View
        style={[
          { flex: 1, overflow: "hidden" },
          wallpaper !== "default" &&
            (WALLPAPERS[wallpaper]?.isGradient
              ? { backgroundColor: "transparent" }
              : { backgroundColor: WALLPAPERS[wallpaper]?.bg }),
        ]}
      >
        {wallpaper === "sunset" && (
          <LinearGradient
            colors={WALLPAPERS.sunset.colors as any}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        {wallpaper === "neon" && (
          <LinearGradient
            colors={WALLPAPERS.neon.colors as any}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        {wallpaper === "sneakers" && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: colors.muted,
                opacity: 0.12,
                flexWrap: "wrap",
                flexDirection: "row",
                gap: 18,
                padding: 20,
              },
            ]}
          >
            {Array.from({ length: 90 }).map((_, i) => (
              <Text key={i} style={{ fontSize: 24 }}>
                👟
              </Text>
            ))}
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          extraData={currentUser?.id}
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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={
            typing ? (
              <View style={styles.typingRow}>
                <UserAvatar
                  displayName={getConvTitle()}
                  avatarColor={getConvAvatarColor()}
                  size={24}
                />
                <View
                  style={[
                    styles.typingBubble,
                    { backgroundColor: colors.muted },
                  ]}
                >
                  <View style={styles.typingDots}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.typingDot,
                          { backgroundColor: colors.mutedForeground },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyConv}>
              <UserAvatar
                displayName={getConvTitle()}
                avatarColor={getConvAvatarColor()}
                size={72}
              />
              <Text
                style={[styles.emptyConvName, { color: colors.foreground }]}
              >
                {getConvTitle()}
              </Text>
              <Text
                style={[
                  styles.emptyConvText,
                  { color: colors.mutedForeground },
                ]}
              >
                {isGroup
                  ? "Group created! Say hello 👋"
                  : "Say hi to start the conversation!"}
              </Text>
            </View>
          }
        />
      </View>

      {/* Input Bar */}
      {isRecording ? (
        <RecordingIndicator
          duration={recordingDuration}
          bottomPadding={Platform.OS === "web" ? 34 : insets.bottom + 4}
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
          <Pressable
            onPress={() => setAttachVisible(true)}
            style={[styles.inputIconBtn, { backgroundColor: colors.muted }]}
          >
            <Ionicons name="add" size={22} color={colors.foreground} />
          </Pressable>

          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              placeholder="Message…"
              placeholderTextColor={colors.mutedForeground}
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={1000}
              onSubmitEditing={Platform.OS === "web" ? handleSend : undefined}
            />
          </View>

          {inputText.trim() ? (
            <Pressable
              onPress={handleSend}
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="send" size={17} color="#FFF" />
            </Pressable>
          ) : (
            <Pressable
              onPress={Platform.OS === "web" ? undefined : handleStartRecording}
              style={[styles.sendBtn, { backgroundColor: colors.muted }]}
            >
              <Ionicons
                name="mic"
                size={20}
                color={
                  Platform.OS === "web" ? colors.border : colors.mutedForeground
                }
              />
            </Pressable>
          )}
        </View>
      )}

      <AttachmentMenu
        visible={attachVisible}
        onClose={() => setAttachVisible(false)}
        onPickImage={pickImage}
        onPickFile={pickFile}
        onPickSticker={() => setStickerVisible(true)}
        onPickContact={() => setContactVisible(true)}
      />

      <StickerPickerModal
        visible={stickerVisible}
        onClose={() => setStickerVisible(false)}
        onPick={sendSticker}
      />

      <ContactPickerModal
        visible={contactVisible}
        contacts={shareableContacts}
        onClose={() => setContactVisible(false)}
        onPick={sendContact}
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
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 8, borderRadius: 12 },
  onlineIndicator: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  headerTitleBlock: { flex: 1 },
  convTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  convSubtitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerAction: { padding: 8, borderRadius: 12 },
  messagesList: { flexGrow: 1, paddingVertical: 8 },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  // Typing indicator
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    transform: [{ scaleY: -1 }],
  },
  typingBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
  },
  typingDots: { flexDirection: "row", gap: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 4, opacity: 0.7 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputIconBtn: { padding: 8, borderRadius: 12, marginBottom: 4 },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textInput: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 20 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  emptyConvText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  // Recording bar
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelRec: { padding: 4 },
  recIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  recTimer: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  recHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sendRecBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
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
  attachIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  attachLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  stickerSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  contactSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  stickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stickerBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerText: { fontSize: 30 },
  emptySheetText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  contactHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stickerMessageRow: { width: "100%", flexDirection: "row", marginVertical: 2, paddingHorizontal: 10 },
  stickerMessage: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stickerMessageText: { fontSize: 42 },
  contactMessageRow: { width: "100%", flexDirection: "row", marginVertical: 2, paddingHorizontal: 10 },
  contactMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "78%",
    minWidth: 220,
    borderRadius: 18,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  contactMessageName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  contactMessageMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
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
  groupAvatarSection: { alignItems: "center", gap: 8, marginBottom: 24 },
  groupAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  groupAvatarText: { color: "#FFF", fontSize: 28, fontFamily: "Inter_700Bold" },
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
