import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type MessageType =
  | "text"
  | "voice"
  | "image"
  | "video"
  | "file"
  | "sticker"
  | "contact";

export type AppUser = {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  location?: string;
  isBot: boolean;
};

export type FriendRequest = {
  id: string;
  fromId: string;
  toId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
};

export type Story = {
  id: string;
  userId: string;
  type: "text" | "image" | "video" | "voice" | "sticker";
  mediaUri?: string;
  audioDuration?: number;
  text?: string;
  sticker?: string;
  backgroundColor?: string; // For text stories
  createdAt: number;
  expiresAt: number; // 12 hours after creation
  viewers: string[]; // User IDs who have viewed this story
};

export type Conversation = {
  id: string;
  type: "direct" | "group";
  name?: string;
  memberIds: string[];
  createdAt: number;
  createdBy?: string;
  groupMode?: "standard" | "anonymous";
  memberLimit?: number;
  allowedLocations?: string[];
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  audioUri?: string;
  audioDuration?: number;
  imageUri?: string;
  videoUri?: string;
  fileUri?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  sticker?: string;
  contact?: {
    id?: string;
    displayName: string;
    username?: string;
    phone?: string;
    avatarColor?: string;
  };
  timestamp: number;
  status?: "sending" | "sent" | "failed";
};

export type MediaPayload =
  | { type: "text"; text: string }
  | { type: "voice"; audioUri: string; audioDuration: number }
  | { type: "image"; imageUri: string }
  | {
      type: "video";
      videoUri: string;
      fileName?: string;
      fileSize?: number;
      fileMimeType?: string;
    }
  | {
      type: "file";
      fileUri: string;
      fileName: string;
      fileSize: number;
      fileMimeType?: string;
    }
  | { type: "sticker"; sticker: string }
  | { type: "contact"; contact: NonNullable<Message["contact"]> };

export type GroupMode = "standard" | "anonymous";

export type CreateGroupOptions = {
  name: string;
  memberIds: string[];
  groupMode?: GroupMode;
  memberLimit?: number;
  allowedLocations?: string[];
};

export const SEED_USERS: AppUser[] = [
  {
    id: "bot_1",
    username: "localmarket",
    displayName: "Local Market",
    avatarColor: "#FF6B6B",
    bio: "Doorstep shopper",
    isBot: true,
  },
  {
    id: "bot_2",
    username: "marketconnect",
    displayName: "Alex Chen",
    avatarColor: "#4ECDC4",
    bio: "Local merchant connector",
    isBot: true,
  },
  {
    id: "bot_3",
    username: "sam_services",
    displayName: "Sam Rivera",
    avatarColor: "#FFD93D",
    bio: "Service finder",
    isBot: true,
  },
  {
    id: "bot_4",
    username: "taylorshop",
    displayName: "Taylor Kim",
    avatarColor: "#A29BFE",
    bio: "Puma & lifestyle kicks 🌸",
    isBot: true,
  },
  {
    id: "bot_5",
    username: "retrofinds",
    displayName: "Riley Park",
    avatarColor: "#FD79A8",
    bio: "Vintage and local finds",
    isBot: true,
  },
  {
    id: "bot_6",
    username: "freshdrops",
    displayName: "Casey Local",
    avatarColor: "#00B894",
    bio: "Watching new Doorstep listings",
    isBot: true,
  },
];

const BOT_REPLIES = [
  "Just copped a pair of Travis Scott 1s 🔥",
  "Have you seen today's Doorstep picks?",
  "That merchant responds quickly.",
  "That colorway is absolute fire 🔥",
  "Local delivery is moving fast today.",
  "W or L? I personally love the design",
  "That shop has good reviews.",
  "I would message the merchant before checkout.",
  "New listings are landing this afternoon.",
  "My collection just hit 50 pairs 😤",
  "The hype on this drop is REAL bro",
  "Already copped mine on SNKRS. You in?",
  "Looking for nearby stock if you see any.",
  "The resale on these is crazy rn",
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

const MIN_ANONYMOUS_INVITES = 5;

function normalizeLocation(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function isLocationAllowed(
  userLocation: string | undefined,
  allowedLocations: string[],
) {
  if (allowedLocations.length === 0) return true;
  const normalizedUserLocation = normalizeLocation(userLocation);
  if (!normalizedUserLocation) return false;
  return allowedLocations.some(
    (location) => normalizeLocation(location) === normalizedUserLocation,
  );
}

function resolveUserById(userId: string, currentUser: AppUser | null) {
  return (
    SEED_USERS.find((user) => user.id === userId) ??
    (currentUser?.id === userId ? currentUser : undefined)
  );
}

async function uploadFileToSupabase(
  localUri: string,
  type: "image" | "video" | "file" | "voice",
  fileName: string,
): Promise<string> {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();

    const ext =
      fileName.split(".").pop() ||
      (type === "image"
        ? "jpg"
        : type === "video"
          ? "mp4"
          : type === "voice"
            ? "m4a"
            : "bin");
    const uniqueName = `attachments/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const bucketName = "chat_attachments";
    const fallbackType =
      type === "image"
        ? "image/jpeg"
        : type === "video"
          ? "video/mp4"
          : type === "voice"
            ? "audio/x-m4a"
            : "application/octet-stream";

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(uniqueName, blob, {
        contentType: blob.type || fallbackType,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uniqueName);

    return urlData.publicUrl;
  } catch (err) {
    console.warn("Supabase storage upload error:", err);
    throw err;
  }
}

type ChatContextType = {
  currentUser: AppUser | null;
  allUsers: AppUser[];
  friendRequests: FriendRequest[];
  friends: AppUser[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  stories: Story[];
  isLoaded: boolean;

  setCurrentUser: (user: AppUser) => void;
  searchUsers: (query: string) => AppUser[];
  sendFriendRequest: (toId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
  cancelFriendRequest: (requestId: string) => void;
  getOrCreateDirectConversation: (friendId: string) => string;
  sendMessage: (conversationId: string, text: string) => void;
  sendMediaMessage: (conversationId: string, payload: MediaPayload) => void;
  createGroup: (options: CreateGroupOptions) => string;
  addGroupMember: (conversationId: string, userId: string) => void;
  removeGroupMember: (conversationId: string, userId: string) => void;
  getConversation: (id: string) => Conversation | undefined;
  getConversationMessages: (id: string) => Message[];
  getLastMessage: (conversationId: string) => Message | undefined;
  getUser: (id: string) => AppUser | undefined;
  getPendingReceivedRequests: () => FriendRequest[];
  getPendingSentRequests: () => FriendRequest[];
  isFriend: (userId: string) => boolean;
  hasPendingRequest: (toId: string) => boolean;
  getUnreadCount: () => number;
  markConversationAsRead: (conversationId: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  deleteConversation: (conversationId: string) => void;
  getConversationUnreadCount: (conversationId: string) => number;
  addStory: (payload: {
    type: Story["type"];
    mediaUri?: string;
    audioDuration?: number;
    text?: string;
    sticker?: string;
    backgroundColor?: string;
  }) => void;
  deleteStory: (storyId: string) => void;
  markStoryAsViewed: (storyId: string) => void;
  getActiveStories: () => Record<string, Story[]>; // Grouped by userId
};

const ChatContext = createContext<ChatContextType | null>(null);
const STORAGE_KEY = "kinetic_chat_v3";

type PersistedState = {
  currentUser: AppUser | null;
  friendRequests: FriendRequest[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  lastRead: Record<string, number>;
  stories: Story[];
};

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [lastRead, setLastRead] = useState<Record<string, number>>({});
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const s: PersistedState = JSON.parse(raw);
          if (s.currentUser) {
            setCurrentUserState(s.currentUser);
          } else {
            setCurrentUserState({
              id: "me_" + Date.now(),
              username: "doorstep_user",
              displayName: "Doorstep User",
              avatarColor: "#13B734",
              bio: "Sneaker enthusiast",
              location: "",
              isBot: false,
            });
          }
          setFriendRequests(s.friendRequests ?? []);
          setConversations(s.conversations ?? []);
          setMessages(s.messages ?? {});
          setLastRead(s.lastRead ?? {});

          // Filter out expired stories on load
          const now = Date.now();
          const activeStories = (s.stories ?? []).filter(
            (story) => story.expiresAt > now,
          );
          setStories(activeStories);
        } catch {
          setCurrentUserState({
            id: "me_" + Date.now(),
            username: "doorstep_user",
            displayName: "Doorstep User",
            avatarColor: "#13B734",
            bio: "Sneaker enthusiast",
            location: "",
            isBot: false,
          });
        }
      } else {
        setCurrentUserState({
          id: "me_" + Date.now(),
          username: "doorstep_user",
          displayName: "Doorstep User",
          avatarColor: "#13B734",
          bio: "Sneaker enthusiast",
          location: "",
          isBot: false,
        });
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const state: PersistedState = {
      currentUser,
      friendRequests,
      conversations,
      messages,
      lastRead,
      stories: stories.filter((s) => s.expiresAt > Date.now()), // Only persist active stories
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    currentUser,
    friendRequests,
    conversations,
    messages,
    lastRead,
    stories,
    isLoaded,
  ]);

  const friends = SEED_USERS.filter((u) =>
    friendRequests.some(
      (r) =>
        r.status === "accepted" &&
        ((r.fromId === currentUser?.id && r.toId === u.id) ||
          (r.toId === currentUser?.id && r.fromId === u.id)),
    ),
  );

  const setCurrentUser = useCallback((user: AppUser) => {
    setCurrentUserState(user);
  }, []);

  const searchUsers = useCallback(
    (query: string): AppUser[] => {
      if (!query.trim() || !currentUser) return [];
      const q = query.toLowerCase();
      return SEED_USERS.filter(
        (u) =>
          (u.username.toLowerCase().includes(q) ||
            u.displayName.toLowerCase().includes(q)) &&
          u.id !== currentUser.id,
      );
    },
    [currentUser],
  );

  const sendFriendRequest = useCallback(
    (toId: string) => {
      if (!currentUser) return;
      const exists = friendRequests.some(
        (r) =>
          (r.fromId === currentUser.id && r.toId === toId) ||
          (r.toId === currentUser.id && r.fromId === toId),
      );
      if (exists) return;
      const newReq: FriendRequest = {
        id: genId(),
        fromId: currentUser.id,
        toId,
        status: "pending",
        createdAt: Date.now(),
      };
      setFriendRequests((prev) => [...prev, newReq]);
      const target = SEED_USERS.find((u) => u.id === toId);
      if (target?.isBot) {
        setTimeout(() => {
          setFriendRequests((prev) =>
            prev.map((r) =>
              r.id === newReq.id ? { ...r, status: "accepted" } : r,
            ),
          );
        }, 2500);
      }
    },
    [currentUser, friendRequests],
  );

  const acceptFriendRequest = useCallback((requestId: string) => {
    setFriendRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: "accepted" } : r)),
    );
  }, []);

  const rejectFriendRequest = useCallback((requestId: string) => {
    setFriendRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: "rejected" } : r)),
    );
  }, []);

  const cancelFriendRequest = useCallback((requestId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const getOrCreateDirectConversation = useCallback(
    (friendId: string): string => {
      if (!currentUser) return "";
      const existing = conversations.find(
        (c) =>
          c.type === "direct" &&
          c.memberIds.includes(currentUser.id) &&
          c.memberIds.includes(friendId),
      );
      if (existing) return existing.id;
      const newConv: Conversation = {
        id: genId(),
        type: "direct",
        memberIds: [currentUser.id, friendId],
        createdAt: Date.now(),
      };
      setConversations((prev) => [...prev, newConv]);
      return newConv.id;
    },
    [currentUser, conversations],
  );

  const triggerBotReply = useCallback(
    (conversationId: string, botIds: string[]) => {
      if (botIds.length === 0) return;
      const delay = 1200 + Math.random() * 1800;
      setTimeout(() => {
        const botId = botIds[Math.floor(Math.random() * botIds.length)];
        const replyText =
          BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
        const botMsg: Message = {
          id: genId(),
          conversationId,
          senderId: botId,
          type: "text",
          text: replyText,
          timestamp: Date.now(),
        };
        setMessages((prev) => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] ?? []), botMsg],
        }));
      }, delay);
    },
    [],
  );

  const sendMessage = useCallback(
    (conversationId: string, text: string) => {
      if (!currentUser || !text.trim()) return;
      const msg: Message = {
        id: genId(),
        conversationId,
        senderId: currentUser.id,
        type: "text",
        text: text.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), msg],
      }));
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      const botIds = conv.memberIds.filter(
        (id) =>
          id !== currentUser.id && SEED_USERS.find((u) => u.id === id)?.isBot,
      );
      triggerBotReply(conversationId, botIds);
    },
    [currentUser, conversations, triggerBotReply],
  );

  const sendMediaMessage = useCallback(
    async (conversationId: string, payload: MediaPayload) => {
      if (!currentUser) return;

      const tempId = genId();
      const base = {
        id: tempId,
        conversationId,
        senderId: currentUser.id,
        timestamp: Date.now(),
        status: "sending" as const,
      };

      let msg: Message;
      if (payload.type === "voice") {
        msg = {
          ...base,
          type: "voice",
          audioUri: payload.audioUri,
          audioDuration: payload.audioDuration,
        };
      } else if (payload.type === "image") {
        msg = { ...base, type: "image", imageUri: payload.imageUri };
      } else if (payload.type === "video") {
        msg = {
          ...base,
          type: "video",
          videoUri: payload.videoUri,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          fileMimeType: payload.fileMimeType,
        };
      } else if (payload.type === "file") {
        msg = {
          ...base,
          type: "file",
          fileUri: payload.fileUri,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          fileMimeType: payload.fileMimeType,
        };
      } else if (payload.type === "sticker") {
        msg = { ...base, type: "sticker", sticker: payload.sticker };
      } else if (payload.type === "contact") {
        msg = { ...base, type: "contact", contact: payload.contact };
      } else {
        msg = { ...base, type: "text", text: payload.text };
      }

      // Add as sending first
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), msg],
      }));

      // Asynchronously upload in background
      try {
        let finalUri = "";
        const uriToUpload =
          payload.type === "image"
            ? payload.imageUri
            : payload.type === "video"
              ? payload.videoUri
              : payload.type === "voice"
                ? payload.audioUri
                : payload.type === "file"
                  ? payload.fileUri
                  : "";
        const uploadKind =
          payload.type === "image" ||
          payload.type === "video" ||
          payload.type === "voice" ||
          payload.type === "file"
            ? payload.type
            : null;
        const uploadName =
          payload.type === "voice"
            ? "voice.m4a"
            : payload.type === "video"
              ? payload.fileName || "video.mp4"
              : payload.type === "file"
                ? payload.fileName
                : "image.jpg";

        if (uriToUpload && uploadKind && !uriToUpload.startsWith("http")) {
          finalUri = await uploadFileToSupabase(
            uriToUpload,
            uploadKind,
            uploadName,
          );
        }

        // Mark as sent and update URI
        setMessages((prev) => {
          const list = prev[conversationId] ?? [];
          return {
            ...prev,
            [conversationId]: list.map((m) => {
              if (m.id === tempId) {
                const updated = { ...m, status: "sent" as const };
                if (payload.type === "image" && finalUri) {
                  updated.imageUri = finalUri;
                } else if (payload.type === "video" && finalUri) {
                  updated.videoUri = finalUri;
                } else if (payload.type === "voice" && finalUri) {
                  updated.audioUri = finalUri;
                } else if (payload.type === "file" && finalUri) {
                  updated.fileUri = finalUri;
                }
                return updated;
              }
              return m;
            }),
          };
        });
      } catch (err) {
        console.warn(
          "Upload background fail, preserving local URI as fallback",
          err,
        );
        // Fallback: mark sent anyway using the local cache URI so it works offline/sandbox
        setMessages((prev) => {
          const list = prev[conversationId] ?? [];
          return {
            ...prev,
            [conversationId]: list.map((m) => {
              if (m.id === tempId) {
                return { ...m, status: "sent" as const };
              }
              return m;
            }),
          };
        });
      }

      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      const botIds = conv.memberIds.filter(
        (id) =>
          id !== currentUser.id && SEED_USERS.find((u) => u.id === id)?.isBot,
      );
      triggerBotReply(conversationId, botIds);
    },
    [currentUser, conversations, triggerBotReply],
  );

  const createGroup = useCallback(
    (options: CreateGroupOptions): string => {
      if (!currentUser) return "";
      const name = options.name.trim();
      const memberIds = Array.from(
        new Set(options.memberIds.filter((id) => id !== currentUser.id)),
      );
      const groupMode = options.groupMode ?? "standard";

      if (!name || memberIds.length === 0) return "";

      if (groupMode === "anonymous") {
        const memberLimit = options.memberLimit ?? 0;
        const allowedLocations = Array.from(
          new Set(
            (options.allowedLocations ?? [])
              .map((location) => location.trim())
              .filter(Boolean),
          ),
        );

        if (memberIds.length < 5) return "";
        if (memberLimit < memberIds.length + 1) return "";
        if (allowedLocations.length === 0) return "";

        const hasRestrictedMember = memberIds.some((userId) => {
          const invitedUser = resolveUserById(userId, currentUser);
          return !isLocationAllowed(invitedUser?.location, allowedLocations);
        });

        if (hasRestrictedMember) return "";

        const newConv: Conversation = {
          id: genId(),
          type: "group",
          name,
          memberIds: [currentUser.id, ...memberIds],
          createdAt: Date.now(),
          createdBy: currentUser.id,
          groupMode,
          memberLimit,
          allowedLocations,
        };
        setConversations((prev) => [...prev, newConv]);
        return newConv.id;
      }

      const newConv: Conversation = {
        id: genId(),
        type: "group",
        name,
        memberIds: [currentUser.id, ...memberIds],
        createdAt: Date.now(),
        createdBy: currentUser.id,
        groupMode: "standard",
      };
      setConversations((prev) => [...prev, newConv]);
      return newConv.id;
    },
    [currentUser],
  );

  const addGroupMember = useCallback(
    (conversationId: string, userId: string) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (
            c.id !== conversationId ||
            c.type !== "group" ||
            c.memberIds.includes(userId)
          ) {
            return c;
          }

          if (c.groupMode === "anonymous") {
            if (c.memberLimit && c.memberIds.length >= c.memberLimit) {
              return c;
            }

            const invitedUser = resolveUserById(userId, currentUser);
            if (
              !isLocationAllowed(
                invitedUser?.location,
                c.allowedLocations ?? [],
              )
            ) {
              return c;
            }
          }

          return { ...c, memberIds: [...c.memberIds, userId] };
        }),
      );
    },
    [currentUser],
  );

  const removeGroupMember = useCallback(
    (conversationId: string, userId: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId && c.type === "group"
            ? { ...c, memberIds: c.memberIds.filter((id) => id !== userId) }
            : c,
        ),
      );
    },
    [],
  );

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations],
  );

  const getConversationMessages = useCallback(
    (id: string) => messages[id] ?? [],
    [messages],
  );

  const getLastMessage = useCallback(
    (conversationId: string) => {
      const msgs = messages[conversationId] ?? [];
      return msgs[msgs.length - 1];
    },
    [messages],
  );

  const getUser = useCallback(
    (id: string): AppUser | undefined => {
      if (currentUser?.id === id) return currentUser;
      return SEED_USERS.find((u) => u.id === id);
    },
    [currentUser],
  );

  const getPendingReceivedRequests = useCallback(
    () =>
      friendRequests.filter(
        (r) => r.toId === currentUser?.id && r.status === "pending",
      ),
    [friendRequests, currentUser],
  );

  const getPendingSentRequests = useCallback(
    () =>
      friendRequests.filter(
        (r) => r.fromId === currentUser?.id && r.status === "pending",
      ),
    [friendRequests, currentUser],
  );

  const isFriend = useCallback(
    (userId: string) =>
      friendRequests.some(
        (r) =>
          r.status === "accepted" &&
          ((r.fromId === currentUser?.id && r.toId === userId) ||
            (r.toId === currentUser?.id && r.fromId === userId)),
      ),
    [friendRequests, currentUser],
  );

  const hasPendingRequest = useCallback(
    (toId: string) =>
      friendRequests.some(
        (r) =>
          r.fromId === currentUser?.id &&
          r.toId === toId &&
          r.status === "pending",
      ),
    [friendRequests, currentUser],
  );

  const getConversationUnreadCount = useCallback(
    (conversationId: string) => {
      const msgs = messages[conversationId] ?? [];
      const readAt = lastRead[conversationId] ?? 0;
      return msgs.filter(
        (m) => m.senderId !== currentUser?.id && m.timestamp > readAt,
      ).length;
    },
    [messages, lastRead, currentUser],
  );

  const getUnreadCount = useCallback(() => {
    return conversations.reduce((total, conv) => {
      if (!conv.memberIds.includes(currentUser?.id ?? "")) return total;
      return total + getConversationUnreadCount(conv.id);
    }, 0);
  }, [conversations, getConversationUnreadCount, currentUser]);

  const markConversationAsRead = useCallback((conversationId: string) => {
    setLastRead((prev) => ({ ...prev, [conversationId]: Date.now() }));
  }, []);

  const deleteMessage = useCallback(
    (conversationId: string, messageId: string) => {
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).filter(
          (m) => m.id !== messageId,
        ),
      }));
    },
    [],
  );

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setMessages((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    setLastRead((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const addStory = useCallback(
    (payload: {
      type: Story["type"];
      mediaUri?: string;
      audioDuration?: number;
      text?: string;
      sticker?: string;
      backgroundColor?: string;
    }) => {
      if (!currentUser) return;
      const now = Date.now();
      const storyId = genId();
      const newStory: Story = {
        id: storyId,
        userId: currentUser.id,
        type: payload.type,
        mediaUri: payload.mediaUri,
        audioDuration: payload.audioDuration,
        text: payload.text,
        sticker: payload.sticker,
        backgroundColor: payload.backgroundColor,
        createdAt: now,
        expiresAt: now + 12 * 60 * 60 * 1000, // 12 hours
        viewers: [],
      };
      setStories((prev) => [...prev, newStory]);

      if (payload.mediaUri && !payload.mediaUri.startsWith("http")) {
        const uploadKind =
          payload.type === "image" ||
          payload.type === "video" ||
          payload.type === "voice"
            ? payload.type
            : null;
        if (uploadKind) {
          const fileName =
            uploadKind === "voice"
              ? "story-voice.m4a"
              : uploadKind === "video"
                ? "story-video.mp4"
                : "story-image.jpg";
          uploadFileToSupabase(payload.mediaUri, uploadKind, fileName)
            .then((publicUrl) => {
              setStories((prev) =>
                prev.map((story) =>
                  story.id === storyId
                    ? { ...story, mediaUri: publicUrl }
                    : story,
                ),
              );
            })
            .catch((err) => {
              console.warn("Story upload failed, preserving local URI", err);
            });
        }
      }
    },
    [currentUser],
  );

  const deleteStory = useCallback((storyId: string) => {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
  }, []);

  const markStoryAsViewed = useCallback(
    (storyId: string) => {
      if (!currentUser) return;
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === storyId && !s.viewers.includes(currentUser.id)) {
            return { ...s, viewers: [...s.viewers, currentUser.id] };
          }
          return s;
        }),
      );
    },
    [currentUser],
  );

  const getActiveStories = useCallback(() => {
    if (!currentUser) return {};
    const now = Date.now();
    const active = stories.filter((s) => s.expiresAt > now);

    // Group by user ID
    const grouped: Record<string, Story[]> = {};
    active.forEach((story) => {
      // Only show your own stories or stories of your friends
      if (
        story.userId !== currentUser.id &&
        !friends.some((f) => f.id === story.userId)
      ) {
        return;
      }

      if (!grouped[story.userId]) grouped[story.userId] = [];
      grouped[story.userId].push(story);
    });
    return grouped;
  }, [stories, currentUser, friends]);

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        allUsers: SEED_USERS,
        friendRequests,
        friends,
        conversations,
        messages,
        stories,
        isLoaded,
        setCurrentUser,
        searchUsers,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        cancelFriendRequest,
        getOrCreateDirectConversation,
        sendMessage,
        sendMediaMessage,
        createGroup,
        addGroupMember,
        removeGroupMember,
        getConversation,
        getConversationMessages,
        getLastMessage,
        getUser,
        getPendingReceivedRequests,
        getPendingSentRequests,
        isFriend,
        hasPendingRequest,
        getUnreadCount,
        getConversationUnreadCount,
        markConversationAsRead,
        deleteMessage,
        deleteConversation,
        addStory,
        deleteStory,
        markStoryAsViewed,
        getActiveStories,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
