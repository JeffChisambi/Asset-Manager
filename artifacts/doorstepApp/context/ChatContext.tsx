import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { chatApiCall, ChatAuthError } from "@/lib/api";
import { getApiBase } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AppUser = {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string;
  bio?: string;
  isBot?: boolean;
  location?: string;
};

export type FriendRequest = {
  id: string;
  fromId: string;
  toId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
};

export type Conversation = {
  id: string;
  type: "direct" | "group";
  memberIds: string[];
  name?: string;
  createdAt: number;
  createdBy?: string;
  groupMode?: "standard" | "anonymous";
  memberLimit?: number;
  allowedLocations?: string[];
};

type ContactPayload = { name: string; phone: string };

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  type: "text" | "image" | "voice" | "video" | "file" | "sticker" | "contact";
  text?: string;
  imageUri?: string;
  audioUri?: string;
  audioDuration?: number;
  videoUri?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  fileUri?: string;
  sticker?: string;
  contact?: ContactPayload;
  timestamp: number;
  status?: "sending" | "sent" | "error";
};

export type Story = {
  id: string;
  userId: string;
  type: "image" | "video" | "voice" | "text";
  mediaUri?: string;
  text?: string;
  sticker?: string;
  backgroundColor?: string;
  audioDuration?: number;
  createdAt: number;
  expiresAt: number;
  viewers: string[];
};

export type MediaPayload =
  | { type: "voice"; audioUri: string; audioDuration: number }
  | { type: "image"; imageUri: string }
  | { type: "video"; videoUri: string; fileName?: string; fileSize?: number; fileMimeType?: string }
  | { type: "file"; fileUri: string; fileName: string; fileSize: number; fileMimeType: string }
  | { type: "sticker"; sticker: string }
  | { type: "contact"; contact: ContactPayload }
  | { type: "text"; text: string };

export type CreateGroupOptions = {
  name: string;
  memberIds: string[];
  groupMode?: "standard" | "anonymous";
  memberLimit?: number;
  allowedLocations?: string[];
};

export type ChatContextType = {
  currentUser: AppUser | null;
  allUsers: AppUser[];
  friendRequests: FriendRequest[];
  friends: AppUser[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  stories: Story[];
  isLoaded: boolean;
  setCurrentUser: (user: AppUser, token?: string) => void;
  logout: () => Promise<void>;
  searchUsers: (query: string) => Promise<AppUser[]>;
  discoverUsers: (cursor?: string) => Promise<{ users: AppUser[], nextCursor: string | null, hasMore: boolean }>;
  sendFriendRequest: (toId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
  cancelFriendRequest: (requestId: string) => void;
  getOrCreateDirectConversation: (friendId: string) => string;
  ensureDirectConversation: (friendId: string) => Promise<string>;
  sendMessage: (conversationId: string, text: string) => void;
  sendMediaMessage: (conversationId: string, payload: MediaPayload) => Promise<void>;
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
  getConversationUnreadCount: (conversationId: string) => number;
  markConversationAsRead: (conversationId: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  deleteConversation: (conversationId: string) => void;
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
  getActiveStories: () => Record<string, Story[]>;
};

// ─── Exported for backward compat (empty — no more bots) ─────────────────────
export const SEED_USERS: AppUser[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function genUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface ApiProfile {
  id: string;
  username: string;
  displayName?: string;
  display_name?: string;
  avatarColor?: string;
  avatar_color?: string;
  avatarUrl?: string;
  avatar_url?: string;
  bio?: string;
}

interface ApiRequest {
  id: number;
  fromId?: string;
  from_id?: string;
  toId?: string;
  to_id?: string;
  status: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

interface ApiConversation {
  id: string;
  type: string;
  name?: string;
  createdBy?: string;
  created_by?: string;
  memberIds?: string[];
  createdAt?: string;
  created_at?: string;
}

interface ApiMessage {
  id: string;
  conversationId?: string;
  conversation_id?: string;
  senderId?: string;
  sender_id?: string;
  type: string;
  text?: string;
  mediaUrl?: string;
  media_url?: string;
  fileName?: string;
  file_name?: string;
  fileSize?: number;
  file_size?: number;
  fileMimeType?: string;
  file_mime_type?: string;
  audioDuration?: number;
  audio_duration?: number;
  sticker?: string;
  createdAt?: string;
  created_at?: string;
}

interface PollResult {
  messages: ApiMessage[];
  friendRequests: ApiRequest[];
  timestamp: number;
}

function mapProfile(p: ApiProfile): AppUser {
  return {
    id: p.id,
    username: p.username,
    displayName: p.displayName ?? p.display_name ?? p.username,
    avatarColor: p.avatarColor ?? p.avatar_color ?? "#13B734",
    avatarUrl: p.avatarUrl ?? p.avatar_url,
    bio: p.bio ?? "",
    isBot: false,
  };
}

function mapRequest(r: ApiRequest): FriendRequest {
  return {
    id: String(r.id),
    fromId: r.fromId ?? r.from_id ?? "",
    toId: r.toId ?? r.to_id ?? "",
    status: (r.status as FriendRequest["status"]) ?? "pending",
    createdAt: r.createdAt || r.created_at ? new Date(r.createdAt ?? r.created_at ?? "").getTime() : Date.now(),
  };
}

function mapConversation(c: ApiConversation): Conversation {
  return {
    id: c.id,
    type: (c.type as "direct" | "group") ?? "direct",
    memberIds: c.memberIds ?? [],
    name: c.name,
    createdAt: c.createdAt || c.created_at ? new Date(c.createdAt ?? c.created_at ?? "").getTime() : Date.now(),
    createdBy: c.createdBy ?? c.created_by,
  };
}

function mapMessage(m: ApiMessage): Message {
  const convId = m.conversationId ?? m.conversation_id ?? "";
  const senderId = m.senderId ?? m.sender_id ?? "";
  const ts = m.createdAt ?? m.created_at;
  const timestamp = ts ? new Date(ts).getTime() : Date.now();
  const mediaUrl = m.mediaUrl ?? m.media_url;
  const type = (m.type as Message["type"]) ?? "text";

  const base: Message = {
    id: m.id,
    conversationId: convId,
    senderId,
    type,
    timestamp,
    status: "sent",
  };

  if (type === "text") return { ...base, text: m.text };
  if (type === "image") return { ...base, imageUri: mediaUrl };
  if (type === "voice") return { ...base, audioUri: mediaUrl, audioDuration: m.audioDuration ?? m.audio_duration };
  if (type === "video") return { ...base, videoUri: mediaUrl, fileName: m.fileName ?? m.file_name, fileSize: m.fileSize ?? m.file_size, fileMimeType: m.fileMimeType ?? m.file_mime_type };
  if (type === "file") return { ...base, fileUri: mediaUrl, fileName: m.fileName ?? m.file_name, fileSize: m.fileSize ?? m.file_size, fileMimeType: m.fileMimeType ?? m.file_mime_type };
  if (type === "sticker") return { ...base, sticker: m.sticker };
  return { ...base, text: m.text };
}

async function uploadFileToSupabase(
  uri: string,
  kind: string,
  name: string | undefined,
): Promise<string> {
  const bucket = "chat_attachments";
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext =
    name?.split(".").pop() ??
    (kind === "voice" ? "m4a" : kind === "video" ? "mp4" : "jpg");
  const remotePath = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(remotePath, blob, {
      contentType: blob.type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const [userCache, setUserCache] = useState<Record<string, AppUser>>({});
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [lastRead, setLastRead] = useState<Record<string, number>>({});
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Stable refs for closures that outlive renders
  const tokenRef = useRef<string | null>(null);
  const currentUserRef = useRef<AppUser | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const userCacheRef = useRef<Record<string, AppUser>>({});
  const pollTs = useRef<number>(Date.now() - 60_000);

  useEffect(() => { tokenRef.current = authToken; }, [authToken]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { userCacheRef.current = userCache; }, [userCache]);

  // ── Persist lastRead & stories ──────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.setItem("chatLastRead", JSON.stringify(lastRead)).catch(() => {});
  }, [lastRead]);

  useEffect(() => {
    AsyncStorage.setItem("chatStories", JSON.stringify(stories)).catch(() => {});
  }, [stories]);

  // ── Internal helpers ────────────────────────────────────────────────────────

  const addToUserCache = useCallback((profiles: AppUser[]) => {
    if (!profiles.length) return;
    setUserCache((prev) => {
      const next = { ...prev };
      profiles.forEach((u) => { next[u.id] = u; });
      return next;
    });
  }, []);

  const loadUserProfiles = useCallback(async (ids: string[], token: string) => {
    const toFetch = ids.filter((id) => !userCacheRef.current[id]);
    if (!toFetch.length) return;
    const data = await chatApiCall<ApiProfile[]>(
      `/api/chat/users?ids=${toFetch.join(",")}`, "GET", token,
    );
    if (data) addToUserCache(data.map(mapProfile));
  }, [addToUserCache]);

  const loadFriendRequests = useCallback(async (token: string, myId: string) => {
    const data = await chatApiCall<ApiRequest[]>("/api/chat/friend-requests", "GET", token);
    if (!data) return;
    setFriendRequests(data.map(mapRequest));
    // Pre-load friend profiles
    const friendIds = data
      .filter((r) => r.status === "accepted")
      .map((r) => (r.fromId ?? r.from_id) === myId
        ? (r.toId ?? r.to_id ?? "")
        : (r.fromId ?? r.from_id ?? ""))
      .filter(Boolean);
    if (friendIds.length) await loadUserProfiles(friendIds, token);
  }, [loadUserProfiles]);

  const loadConversations = useCallback(async (token: string) => {
    const data = await chatApiCall<ApiConversation[]>("/api/chat/conversations", "GET", token);
    if (!data) return;
    const mapped = data.map(mapConversation);
    setConversations(mapped);
    // Load member profiles
    const memberIds = [...new Set(mapped.flatMap((c) => c.memberIds))];
    if (memberIds.length) await loadUserProfiles(memberIds, token);
  }, [loadUserProfiles]);

  const loadConvMessages = useCallback(async (convId: string, token: string) => {
    const data = await chatApiCall<ApiMessage[]>(
      `/api/chat/conversations/${convId}/messages`, "GET", token,
    );
    if (!data) return;
    setMessages((prev) => ({
      ...prev,
      [convId]: data.map(mapMessage),
    }));
  }, []);

  const loadStories = useCallback(async (token: string) => {
    // Placeholder for actual story loading when backend API is ready
    return [];
  }, []);

  // ── Initialise ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      try {
        const [token, savedLastRead, savedStories, savedUser] = await Promise.all([
          AsyncStorage.getItem("chatAuthToken"),
          AsyncStorage.getItem("chatLastRead"),
          AsyncStorage.getItem("chatStories"),
          AsyncStorage.getItem("doorstep_current_user"),
        ]);

        if (savedLastRead) {
          try { setLastRead(JSON.parse(savedLastRead)); } catch {}
        }
        if (savedStories) {
          try {
            const parsed: Story[] = JSON.parse(savedStories);
            const now = Date.now();
            setStories(parsed.filter((s) => s.expiresAt > now));
          } catch {}
        }

        // ── FAST PATH: restore from local cache immediately ──────────────────
        // This allows Chat and Profile tabs to render without waiting for the API.
        if (savedUser) {
          try {
            const user: AppUser = JSON.parse(savedUser);
            currentUserRef.current = user;
            setCurrentUserState(user);
            addToUserCache([user]);
          } catch {}
        }

        // Unblock the UI immediately once local data is loaded.
        // The API refresh below will update state silently in the background.
        setIsLoaded(true);

        // ── BACKGROUND REFRESH: sync with server ─────────────────────────────
        if (token) {
          tokenRef.current = token;
          setAuthTokenState(token);
          try {
            const profile = await chatApiCall<ApiProfile>("/api/chat/profile/me", "GET", token);
            if (profile) {
              const user = mapProfile(profile);
              currentUserRef.current = user;
              setCurrentUserState(user);
              addToUserCache([user]);
              // Persist user object so profile service can use it as fallback
              AsyncStorage.setItem("doorstep_current_user", JSON.stringify(user)).catch(() => {});

              // ── Sync real avatarUrl from local profile store to chat server ──
              // The Supabase/local profile (avatarUrl) is separate from the chat
              // profile. We read it and push it up so the chat header shows the
              // real user photo instead of the initials fallback.
              try {
                const localRaw = await AsyncStorage.getItem(`profile_data_${user.id}`);
                if (localRaw) {
                  const localProfile = JSON.parse(localRaw);
                  if (localProfile?.avatarUrl && localProfile.avatarUrl !== profile.avatarUrl) {
                    
                    let finalAvatarUrl = localProfile.avatarUrl;
                    
                    // Auto-upload the local file if it hasn't been uploaded to the chat API yet
                    if (finalAvatarUrl.startsWith("file://")) {
                      try {
                        const { getApiBase } = require("@/lib/api");
                        const formData = new FormData();
                        const ext = finalAvatarUrl.split(".").pop() || "jpg";
                        formData.append("file", {
                          uri: Platform.OS === "android" ? finalAvatarUrl : finalAvatarUrl.replace("file://", ""),
                          name: `avatar.${ext}`,
                          type: `image/${ext === "png" ? "png" : "jpeg"}`,
                        } as any);

                        const res = await fetch(`${getApiBase()}/api/chat/upload-image`, {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                          body: formData,
                        });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.imageUrl) {
                            finalAvatarUrl = data.imageUrl;
                            // Update the local storage with the new HTTP URL so we don't upload again
                            localProfile.avatarUrl = finalAvatarUrl;
                            await AsyncStorage.setItem(`profile_data_${user.id}`, JSON.stringify(localProfile));
                          }
                        }
                      } catch (e) {
                        console.warn("Auto-upload avatar failed:", e);
                      }
                    }

                    chatApiCall("/api/chat/profile/sync", "POST", token, {
                      avatarUrl: finalAvatarUrl,
                    }).catch(() => {});
                    
                    // Update in-memory state immediately
                    const updatedUser = { ...user, avatarUrl: finalAvatarUrl };
                    currentUserRef.current = updatedUser;
                    setCurrentUserState(updatedUser);
                    addToUserCache([updatedUser]);
                    AsyncStorage.setItem("doorstep_current_user", JSON.stringify(updatedUser)).catch(() => {});
                  }
                }
              } catch {}

              pollTs.current = Date.now() - 60_000;
              // Fire-and-forget — don't block the UI
              Promise.all([
                loadFriendRequests(token, user.id),
                loadConversations(token),
                loadStories(token),
              ]).catch(() => {});
            } else if (!savedUser) {
              // No profile on server and nothing in cache — clear token so AuthGuard can redirect
              await AsyncStorage.multiRemove(["chatAuthToken", "hasLoggedIn"]).catch(() => {});
              tokenRef.current = null;
              setAuthTokenState(null);
              setCurrentUserState(null);
              currentUserRef.current = null;
            }
          } catch (err) {
            if (err instanceof ChatAuthError) {
              // Token is expired/invalid — clear everything so AuthGuard can redirect
              await AsyncStorage.multiRemove(["chatAuthToken", "chatLastRead", "chatStories", "hasLoggedIn", "doorstep_current_user"]).catch(() => {});
              tokenRef.current = null;
              setAuthTokenState(null);
              setCurrentUserState(null);
              currentUserRef.current = null;
              conversationsRef.current = [];
              userCacheRef.current = {};
              setFriendRequests([]);
              setConversations([]);
              setMessages({});
              setLastRead({});
              setStories([]);
              setUserCache({});
            }
            // Network errors are silently swallowed — cached data remains valid
          }
        }
      } catch (err) {
        console.warn("ChatContext init:", err);
        setIsLoaded(true);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Polling ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authToken) return;

    const doPoll = async () => {
      const token = tokenRef.current;
      const me = currentUserRef.current;
      if (!token || !me) return;

      let data: PollResult | null;
      try {
        data = await chatApiCall<PollResult>(
          `/api/chat/poll?since=${pollTs.current}`, "GET", token,
        );
      } catch (err) {
        if (err instanceof ChatAuthError) {
          // Token expired — clear auth state; the user will need to re-login
          await AsyncStorage.multiRemove(["chatAuthToken", "chatLastRead", "chatStories", "hasLoggedIn", "doorstep_current_user"]).catch(() => {});
          tokenRef.current = null;
          setAuthTokenState(null);
          setCurrentUserState(null);
          currentUserRef.current = null;
          conversationsRef.current = [];
          userCacheRef.current = {};
          setFriendRequests([]);
          setConversations([]);
          setMessages({});
          setLastRead({});
          setStories([]);
          setUserCache({});
        }
        return;
      }
      if (!data) return;
      pollTs.current = data.timestamp;

      if (data.messages.length) {
        setMessages((prev) => {
          const next = { ...prev };
          for (const m of data.messages) {
            const cid = m.conversationId ?? m.conversation_id ?? "";
            const existing = next[cid] ?? [];
            if (!existing.some((x) => x.id === m.id)) {
              next[cid] = [...existing, mapMessage(m)];
            }
          }
          return next;
        });
        // Check for unknown conversations
        const newConvIds = [...new Set(
          data.messages.map((m) => m.conversationId ?? m.conversation_id ?? ""),
        )];
        const currentConvs = conversationsRef.current;
        if (newConvIds.some((id) => !currentConvs.find((c) => c.id === id))) {
          loadConversations(token);
        }
      }

      if (data.friendRequests.length) {
        setFriendRequests((prev) => {
          const next = [...prev];
          for (const req of data.friendRequests) {
            const idx = next.findIndex((r) => r.id === String(req.id));
            const mapped = mapRequest(req);
            if (idx >= 0) next[idx] = mapped;
            else next.push(mapped);
          }
          return next;
        });
        // Load profiles for newly accepted friends
        const newAcceptedIds = data.friendRequests
          .filter((r) => r.status === "accepted")
          .map((r) =>
            (r.fromId ?? r.from_id) === me.id
              ? (r.toId ?? r.to_id ?? "")
              : (r.fromId ?? r.from_id ?? ""),
          )
          .filter((id) => id && !userCacheRef.current[id]);
        if (newAcceptedIds.length) loadUserProfiles(newAcceptedIds, token);
      }
    };

    const interval = setInterval(doPoll, 5000);
    // Reload stories every 30 s so fresh friend stories appear
    const storiesInterval = setInterval(() => {
      const token = tokenRef.current;
      if (token) loadStories(token).catch(() => {});
    }, 30_000);
    return () => { clearInterval(interval); clearInterval(storiesInterval); };
  }, [authToken, loadConversations, loadUserProfiles, loadStories]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const friends = useMemo<AppUser[]>(() => {
    if (!currentUser) return [];
    return friendRequests
      .filter(
        (r) =>
          r.status === "accepted" &&
          (r.fromId === currentUser.id || r.toId === currentUser.id),
      )
      .map((r) =>
        userCache[r.fromId === currentUser.id ? r.toId : r.fromId],
      )
      .filter(Boolean) as AppUser[];
  }, [friendRequests, currentUser, userCache]);

  // ── Public API ────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    tokenRef.current = null;
    currentUserRef.current = null;
    conversationsRef.current = [];
    setAuthTokenState(null);
    setCurrentUserState(null);
    setFriendRequests([]);
    setConversations([]);
    setMessages({});
    setLastRead({});
    setStories([]);
    setUserCache({});
    userCacheRef.current = {};
    await AsyncStorage.multiRemove(["chatAuthToken", "chatLastRead", "chatStories", "doorstep_current_user", "hasLoggedIn"]).catch(() => {});
  }, []);

  const setCurrentUser = useCallback((user: AppUser, token?: string) => {
    // If the user is changing, aggressively clear the old state
    if (currentUserRef.current && currentUserRef.current.id !== user.id) {
      conversationsRef.current = [];
      userCacheRef.current = {};
      setFriendRequests([]);
      setConversations([]);
      setMessages({});
      setLastRead({});
      setStories([]);
      setUserCache({});
    }

    setCurrentUserState(user);
    currentUserRef.current = user;
    addToUserCache([user]);
    // Persist user object so profile service can use it as fallback
    AsyncStorage.setItem("doorstep_current_user", JSON.stringify(user)).catch(() => {});
    if (token) {
      tokenRef.current = token;
      setAuthTokenState(token);
      AsyncStorage.setItem("chatAuthToken", token).catch(() => {});
      // Kick off data load
      Promise.all([
        loadFriendRequests(token, user.id),
        loadConversations(token),
      ]).catch(() => {});

      // ── Sync real avatarUrl from local profile store ──────────────────────
      AsyncStorage.getItem(`profile_data_${user.id}`).then((localRaw) => {
        if (!localRaw) return;
        try {
          const localProfile = JSON.parse(localRaw);
          if (localProfile?.avatarUrl) {
            chatApiCall("/api/chat/profile/sync", "POST", token, {
              avatarUrl: localProfile.avatarUrl,
            }).catch(() => {});
            // Update in-memory state immediately
            const updatedUser = { ...user, avatarUrl: localProfile.avatarUrl };
            currentUserRef.current = updatedUser;
            setCurrentUserState(updatedUser);
            addToUserCache([updatedUser]);
            AsyncStorage.setItem("doorstep_current_user", JSON.stringify(updatedUser)).catch(() => {});
          }
        } catch {}
      }).catch(() => {});
    }
  }, [addToUserCache, loadFriendRequests, loadConversations]);

  const searchUsers = useCallback(async (query: string): Promise<AppUser[]> => {
    const q = query.trim();
    if (!q || !tokenRef.current) return [];
    const data = await chatApiCall<ApiProfile[]>(
      `/api/chat/users/search?q=${encodeURIComponent(q)}`, "GET", tokenRef.current,
    );
    if (!data) return [];
    const users = data.map(mapProfile);
    addToUserCache(users);
    return users;
  }, [addToUserCache]);

  const discoverUsers = useCallback(async (cursor?: string): Promise<{ users: AppUser[], nextCursor: string | null, hasMore: boolean }> => {
    if (!tokenRef.current) return { users: [], nextCursor: null, hasMore: false };
    const url = cursor 
      ? `/api/chat/users/discover?cursor=${encodeURIComponent(cursor)}`
      : `/api/chat/users/discover`;
    const data = await chatApiCall<{ users: ApiProfile[], nextCursor: string | null, hasMore: boolean }>(
      url, "GET", tokenRef.current,
    );
    if (!data) return { users: [], nextCursor: null, hasMore: false };
    const users = data.users.map(mapProfile);
    addToUserCache(users);
    return { users, nextCursor: data.nextCursor, hasMore: data.hasMore };
  }, [addToUserCache]);

  const sendFriendRequest = useCallback((toId: string) => {
    const token = tokenRef.current;
    const me = currentUserRef.current;
    if (!token || !me) return;
    // Optimistic
    const optimistic: FriendRequest = {
      id: genId(),
      fromId: me.id,
      toId,
      status: "pending",
      createdAt: Date.now(),
    };
    setFriendRequests((prev) => {
      if (prev.some((r) =>
        (r.fromId === me.id && r.toId === toId) ||
        (r.toId === me.id && r.fromId === toId)
      )) return prev;
      return [...prev, optimistic];
    });
    chatApiCall<ApiRequest>("/api/chat/friend-requests", "POST", token, { toId }).then((res) => {
      if (res) {
        setFriendRequests((prev) =>
          prev.map((r) => r.id === optimistic.id ? mapRequest(res) : r),
        );
      }
    }).catch(() => {});
  }, []);

  const acceptFriendRequest = useCallback((requestId: string) => {
    const token = tokenRef.current;
    setFriendRequests((prev) =>
      prev.map((r) => r.id === requestId ? { ...r, status: "accepted" } : r),
    );
    if (token) {
      chatApiCall(`/api/chat/friend-requests/${requestId}`, "PATCH", token, { action: "accept" }).catch(() => {});
    }
  }, []);

  const rejectFriendRequest = useCallback((requestId: string) => {
    const token = tokenRef.current;
    setFriendRequests((prev) =>
      prev.map((r) => r.id === requestId ? { ...r, status: "rejected" } : r),
    );
    if (token) {
      chatApiCall(`/api/chat/friend-requests/${requestId}`, "PATCH", token, { action: "reject" }).catch(() => {});
    }
  }, []);

  const cancelFriendRequest = useCallback((requestId: string) => {
    const token = tokenRef.current;
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (token) {
      chatApiCall(`/api/chat/friend-requests/${requestId}`, "PATCH", token, { action: "cancel" }).catch(() => {});
    }
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
      return existing?.id ?? "";
    },
    [currentUser, conversations],
  );

  const ensureDirectConversation = useCallback(
    async (friendId: string): Promise<string> => {
      const me = currentUserRef.current;
      const token = tokenRef.current;
      if (!me || !token) return "";
      // Check locally first
      const existing = conversationsRef.current.find(
        (c) =>
          c.type === "direct" &&
          c.memberIds.includes(me.id) &&
          c.memberIds.includes(friendId),
      );
      if (existing) return existing.id;
      // Create via API
      const id = await chatApiCall<string>(
        "/api/chat/conversations/direct", "POST", token, { friendId },
      );
      if (id) {
        await loadConversations(token);
        return id;
      }
      return "";
    },
    [loadConversations],
  );

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const token = tokenRef.current;
    const me = currentUserRef.current;
    if (!token || !me || !text.trim()) return;
    const tempId = genId();
    const msg: Message = {
      id: tempId,
      conversationId,
      senderId: me.id,
      type: "text",
      text: text.trim(),
      timestamp: Date.now(),
      status: "sending",
    };
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), msg],
    }));
    chatApiCall<ApiMessage>(
      `/api/chat/conversations/${conversationId}/messages`, "POST", token,
      { type: "text", text: text.trim() },
    ).then((res) => {
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).map((m) =>
          m.id === tempId
            ? { ...m, id: res?.id ?? tempId, status: "sent" }
            : m,
        ),
      }));
    }).catch(() => {
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] ?? []).map((m) =>
          m.id === tempId ? { ...m, status: "error" } : m,
        ),
      }));
    });
  }, []);

  const sendMediaMessage = useCallback(
    async (conversationId: string, payload: MediaPayload) => {
      const token = tokenRef.current;
      const me = currentUserRef.current;
      if (!token || !me) return;
      const tempId = genId();
      const base = {
        id: tempId,
        conversationId,
        senderId: me.id,
        timestamp: Date.now(),
        status: "sending" as const,
      };
      let msg: Message;
      if (payload.type === "voice") {
        msg = { ...base, type: "voice", audioUri: payload.audioUri, audioDuration: payload.audioDuration };
      } else if (payload.type === "image") {
        msg = { ...base, type: "image", imageUri: payload.imageUri };
      } else if (payload.type === "video") {
        msg = { ...base, type: "video", videoUri: payload.videoUri, fileName: payload.fileName, fileSize: payload.fileSize, fileMimeType: payload.fileMimeType };
      } else if (payload.type === "file") {
        msg = { ...base, type: "file", fileUri: payload.fileUri, fileName: payload.fileName, fileSize: payload.fileSize, fileMimeType: payload.fileMimeType };
      } else if (payload.type === "sticker") {
        msg = { ...base, type: "sticker", sticker: payload.sticker };
      } else if (payload.type === "contact") {
        msg = { ...base, type: "contact", contact: payload.contact };
      } else {
        msg = { ...base, type: "text", text: (payload as any).text };
      }
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), msg],
      }));
      try {
        let finalUri = "";
        const uriToUpload =
          payload.type === "image" ? payload.imageUri :
          payload.type === "video" ? payload.videoUri :
          payload.type === "voice" ? payload.audioUri :
          payload.type === "file" ? payload.fileUri : "";
        const uploadKind =
          payload.type === "image" || payload.type === "video" ||
          payload.type === "voice" || payload.type === "file"
            ? payload.type : null;
        const uploadName =
          payload.type === "voice" ? "voice.m4a" :
          payload.type === "video" ? (payload.fileName ?? "video.mp4") :
          payload.type === "file" ? payload.fileName :
          "image.jpg";
        if (uriToUpload && uploadKind && !uriToUpload.startsWith("http")) {
          finalUri = await uploadFileToSupabase(uriToUpload, uploadKind, uploadName);
        } else if (uriToUpload) {
          finalUri = uriToUpload;
        }

        const apiBody: Record<string, unknown> = {
          type: payload.type,
          mediaUrl: finalUri || undefined,
        };
        if (payload.type === "file" || payload.type === "video") {
          apiBody.fileName = payload.fileName;
          apiBody.fileSize = payload.fileSize;
          apiBody.fileMimeType = payload.fileMimeType;
        }
        if (payload.type === "voice") apiBody.audioDuration = payload.audioDuration;
        if (payload.type === "sticker") apiBody.sticker = payload.sticker;

        const res = await chatApiCall<ApiMessage>(
          `/api/chat/conversations/${conversationId}/messages`, "POST", token, apiBody,
        );
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).map((m) => {
            if (m.id !== tempId) return m;
            const updated = { ...m, id: res?.id ?? tempId, status: "sent" as const };
            if (finalUri) {
              if (payload.type === "image") updated.imageUri = finalUri;
              else if (payload.type === "video") updated.videoUri = finalUri;
              else if (payload.type === "voice") updated.audioUri = finalUri;
              else if (payload.type === "file") updated.fileUri = finalUri;
            }
            return updated;
          }),
        }));
      } catch {
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).map((m) =>
            m.id === tempId ? { ...m, status: "error" as const } : m,
          ),
        }));
      }
    },
    [],
  );

  const createGroup = useCallback((options: CreateGroupOptions): string => {
    const me = currentUserRef.current;
    const token = tokenRef.current;
    if (!me || !options.name.trim() || !options.memberIds.length) return "";
    const convId = genUUID();
    const allMembers = [...new Set([me.id, ...options.memberIds])];
    const newConv: Conversation = {
      id: convId,
      type: "group",
      name: options.name.trim(),
      memberIds: allMembers,
      createdAt: Date.now(),
      createdBy: me.id,
      groupMode: options.groupMode ?? "standard",
      memberLimit: options.memberLimit,
      allowedLocations: options.allowedLocations,
    };
    setConversations((prev) => [...prev, newConv]);
    if (token) {
      chatApiCall("/api/chat/conversations/group", "POST", token, {
        name: newConv.name,
        memberIds: options.memberIds,
      }).then(() => loadConversations(token)).catch(() => {});
    }
    return convId;
  }, [loadConversations]);

  const addGroupMember = useCallback((conversationId: string, userId: string) => {
    const token = tokenRef.current;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId && !c.memberIds.includes(userId)
          ? { ...c, memberIds: [...c.memberIds, userId] }
          : c,
      ),
    );
    if (token) {
      chatApiCall(`/api/chat/conversations/${conversationId}/members`, "POST", token, { userId }).catch(() => {});
    }
  }, []);

  const removeGroupMember = useCallback((conversationId: string, userId: string) => {
    const token = tokenRef.current;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, memberIds: c.memberIds.filter((id) => id !== userId) }
          : c,
      ),
    );
    if (token) {
      chatApiCall(`/api/chat/conversations/${conversationId}/members/${userId}`, "DELETE", token).catch(() => {});
    }
  }, []);

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
      if (id === currentUser?.id) return currentUser;
      return userCache[id];
    },
    [currentUser, userCache],
  );

  const getPendingReceivedRequests = useCallback(
    () => friendRequests.filter((r) => r.toId === currentUser?.id && r.status === "pending"),
    [friendRequests, currentUser],
  );

  const getPendingSentRequests = useCallback(
    () => friendRequests.filter((r) => r.fromId === currentUser?.id && r.status === "pending"),
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
          r.fromId === currentUser?.id && r.toId === toId && r.status === "pending",
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
    // Load messages for this conversation if not already loaded
    const token = tokenRef.current;
    if (token && !(messages[conversationId]?.length)) {
      loadConvMessages(conversationId, token);
    }
  }, [messages, loadConvMessages]);

  const deleteMessage = useCallback((conversationId: string, messageId: string) => {
    setMessages((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] ?? []).filter((m) => m.id !== messageId),
    }));
  }, []);

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

  // ── Stories (server-backed) ────────────────────────────────────────────────

  // Map a raw API story row → Story type used throughout the app
  function mapApiStory(s: any): Story {
    let viewers: string[] = [];
    try { viewers = typeof s.viewers === "string" ? JSON.parse(s.viewers) : (s.viewers ?? []); } catch { viewers = []; }
    return {
      id: s.id,
      userId: s.userId ?? s.user_id,
      type: s.type as Story["type"],
      mediaUri: s.mediaUrl ?? s.media_url ?? undefined,
      text: s.text ?? undefined,
      sticker: s.sticker ?? undefined,
      backgroundColor: s.backgroundColor ?? s.background_color ?? undefined,
      audioDuration: s.audioDuration ?? s.audio_duration ?? undefined,
      createdAt: new Date(s.createdAt ?? s.created_at).getTime(),
      expiresAt: new Date(s.expiresAt ?? s.expires_at).getTime(),
      viewers,
    };
  }

  const loadStories = useCallback(async (token: string) => {
    const data = await chatApiCall<any[]>("/api/chat/stories", "GET", token);
    if (!data) return;
    const now = Date.now();
    const mapped = data.map(mapApiStory).filter((s) => s.expiresAt > now);
    setStories(mapped);
    // Pre-load any user profiles we don't yet know about
    const authorIds = [...new Set(mapped.map((s) => s.userId))];
    if (authorIds.length) loadUserProfiles(authorIds, token).catch(() => {});
  }, [loadUserProfiles]);

  const addStory = useCallback(
    async (payload: {
      type: Story["type"];
      mediaUri?: string;
      audioDuration?: number;
      text?: string;
      sticker?: string;
      backgroundColor?: string;
    }) => {
      const me = currentUserRef.current;
      const token = tokenRef.current;
      if (!me) return;

      const now = Date.now();
      const storyId = genId();

      // Optimistic local insert so UI feels instant
      const optimistic: Story = {
        id: storyId,
        userId: me.id,
        type: payload.type,
        mediaUri: payload.mediaUri,
        audioDuration: payload.audioDuration,
        text: payload.text,
        sticker: payload.sticker,
        backgroundColor: payload.backgroundColor,
        createdAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000,
        viewers: [],
      };
      setStories((prev) => [...prev, optimistic]);

      let finalMediaUrl: string | undefined = payload.mediaUri;

      // If media is a local file, upload it first
      if (finalMediaUrl && !finalMediaUrl.startsWith("http") && token) {
        try {
          const formData = new FormData();
          const ext = finalMediaUrl.split(".").pop() || "jpg";
          formData.append("file", {
            uri: finalMediaUrl,
            name: `story.${ext}`,
            type: `image/${ext === "png" ? "png" : "jpeg"}`,
          } as any);
          const uploadRes = await fetch(`${getApiBase()}/api/chat/upload-image`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.imageUrl) finalMediaUrl = uploadData.imageUrl;
          }
        } catch {}
      }

      // Update optimistic story with the real remote URL
      setStories((prev) =>
        prev.map((s) => s.id === storyId ? { ...s, mediaUri: finalMediaUrl } : s),
      );

      // Persist to server
      if (token) {
        chatApiCall("/api/chat/stories", "POST", token, {
          id: storyId,
          type: payload.type,
          mediaUrl: finalMediaUrl ?? null,
          text: payload.text ?? null,
          sticker: payload.sticker ?? null,
          backgroundColor: payload.backgroundColor ?? null,
          audioDuration: payload.audioDuration ?? null,
        }).catch(() => {
          // Roll back optimistic on failure
          setStories((prev) => prev.filter((s) => s.id !== storyId));
        });
      }
    },
    [],
  );

  const deleteStory = useCallback((storyId: string) => {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
    const token = tokenRef.current;
    if (token) {
      chatApiCall(`/api/chat/stories/${storyId}`, "DELETE", token).catch(() => {});
    }
  }, []);

  const markStoryAsViewed = useCallback(
    (storyId: string) => {
      const me = currentUserRef.current;
      const token = tokenRef.current;
      if (!me) return;
      setStories((prev) =>
        prev.map((s) =>
          s.id === storyId && !s.viewers.includes(me.id)
            ? { ...s, viewers: [...s.viewers, me.id] }
            : s,
        ),
      );
      if (token) {
        chatApiCall(`/api/chat/stories/${storyId}/view`, "PATCH", token).catch(() => {});
      }
    },
    [],
  );

  const getActiveStories = useCallback(() => {
    if (!currentUser) return {};
    const now = Date.now();
    const active = stories.filter((s) => s.expiresAt > now);
    const grouped: Record<string, Story[]> = {};
    active.forEach((story) => {
      if (!grouped[story.userId]) grouped[story.userId] = [];
      grouped[story.userId].push(story);
    });
    return grouped;
  }, [stories, currentUser]);

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
        logout,
        searchUsers,
        discoverUsers,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        cancelFriendRequest,
        getOrCreateDirectConversation,
        ensureDirectConversation,
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
