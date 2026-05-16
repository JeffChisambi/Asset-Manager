import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type AppUser = {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  isBot: boolean;
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
  name?: string;
  memberIds: string[];
  createdAt: number;
  createdBy?: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
};

export const SEED_USERS: AppUser[] = [
  {
    id: "bot_1",
    username: "sneakerking",
    displayName: "Jordan Lee",
    avatarColor: "#FF6B6B",
    bio: "Nike collector | 200+ pairs",
    isBot: true,
  },
  {
    id: "bot_2",
    username: "kicksdealer",
    displayName: "Alex Chen",
    avatarColor: "#4ECDC4",
    bio: "Reseller & sneaker investor",
    isBot: true,
  },
  {
    id: "bot_3",
    username: "airmax_sam",
    displayName: "Sam Rivera",
    avatarColor: "#FFD93D",
    bio: "Air Max enthusiast 🏃",
    isBot: true,
  },
  {
    id: "bot_4",
    username: "pumarose",
    displayName: "Taylor Kim",
    avatarColor: "#A29BFE",
    bio: "Puma & lifestyle kicks 🌸",
    isBot: true,
  },
  {
    id: "bot_5",
    username: "retrokicks",
    displayName: "Riley Park",
    avatarColor: "#FD79A8",
    bio: "Vintage & retro sneakers only",
    isBot: true,
  },
  {
    id: "bot_6",
    username: "freshdrops",
    displayName: "Casey Jordan",
    avatarColor: "#00B894",
    bio: "Hypebeast | Chasing every drop",
    isBot: true,
  },
];

const BOT_REPLIES = [
  "Just copped a pair of Travis Scott 1s 🔥",
  "Have you seen the new Nike drop? Absolute heat!",
  "Bro those are so clean. What size are you?",
  "That colorway is absolute fire 🔥",
  "Thinking about reselling... market is insane rn",
  "W or L? I personally love the design",
  "Those Jordan 3s are a must-cop fr",
  "Air Force 1s never go out of style tbh",
  "Checked the latest Yeezy drop? It's nuts",
  "My collection just hit 50 pairs 😤",
  "The hype on this drop is REAL bro",
  "Already copped mine on SNKRS. You in?",
  "Looking for a size 10 in the Panda Dunks, you got?",
  "The resale on these is crazy rn",
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

type ChatContextType = {
  currentUser: AppUser | null;
  allUsers: AppUser[];
  friendRequests: FriendRequest[];
  friends: AppUser[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  isLoaded: boolean;

  setCurrentUser: (user: AppUser) => void;
  searchUsers: (query: string) => AppUser[];
  sendFriendRequest: (toId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
  cancelFriendRequest: (requestId: string) => void;
  getOrCreateDirectConversation: (friendId: string) => string;
  sendMessage: (conversationId: string, text: string) => void;
  createGroup: (name: string, memberIds: string[]) => string;
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
};

const ChatContext = createContext<ChatContextType | null>(null);
const STORAGE_KEY = "kinetic_chat_v2";

type PersistedState = {
  currentUser: AppUser | null;
  friendRequests: FriendRequest[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
};

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const s: PersistedState = JSON.parse(raw);
          if (s.currentUser) setCurrentUserState(s.currentUser);
          setFriendRequests(s.friendRequests ?? []);
          setConversations(s.conversations ?? []);
          setMessages(s.messages ?? {});
        } catch {}
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
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [currentUser, friendRequests, conversations, messages, isLoaded]);

  const friends = SEED_USERS.filter((u) =>
    friendRequests.some(
      (r) =>
        r.status === "accepted" &&
        ((r.fromId === currentUser?.id && r.toId === u.id) ||
          (r.toId === currentUser?.id && r.fromId === u.id))
    )
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
          u.id !== currentUser.id
      );
    },
    [currentUser]
  );

  const sendFriendRequest = useCallback(
    (toId: string) => {
      if (!currentUser) return;
      const exists = friendRequests.some(
        (r) =>
          (r.fromId === currentUser.id && r.toId === toId) ||
          (r.toId === currentUser.id && r.fromId === toId)
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
              r.id === newReq.id ? { ...r, status: "accepted" } : r
            )
          );
        }, 2500);
      }
    },
    [currentUser, friendRequests]
  );

  const acceptFriendRequest = useCallback((requestId: string) => {
    setFriendRequests((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, status: "accepted" } : r
      )
    );
  }, []);

  const rejectFriendRequest = useCallback((requestId: string) => {
    setFriendRequests((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, status: "rejected" } : r
      )
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
          c.memberIds.includes(friendId)
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
    [currentUser, conversations]
  );

  const sendMessage = useCallback(
    (conversationId: string, text: string) => {
      if (!currentUser || !text.trim()) return;

      const msg: Message = {
        id: genId(),
        conversationId,
        senderId: currentUser.id,
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
        (id) => id !== currentUser.id && SEED_USERS.find((u) => u.id === id)?.isBot
      );

      if (botIds.length > 0) {
        const delay = 1200 + Math.random() * 1800;
        setTimeout(() => {
          const botId = botIds[Math.floor(Math.random() * botIds.length)];
          const replyText = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
          const botMsg: Message = {
            id: genId(),
            conversationId,
            senderId: botId,
            text: replyText,
            timestamp: Date.now(),
          };
          setMessages((prev) => ({
            ...prev,
            [conversationId]: [...(prev[conversationId] ?? []), botMsg],
          }));
        }, delay);
      }
    },
    [currentUser, conversations]
  );

  const createGroup = useCallback(
    (name: string, memberIds: string[]): string => {
      if (!currentUser) return "";
      const newConv: Conversation = {
        id: genId(),
        type: "group",
        name,
        memberIds: [currentUser.id, ...memberIds],
        createdAt: Date.now(),
        createdBy: currentUser.id,
      };
      setConversations((prev) => [...prev, newConv]);
      return newConv.id;
    },
    [currentUser]
  );

  const addGroupMember = useCallback(
    (conversationId: string, userId: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId &&
          c.type === "group" &&
          !c.memberIds.includes(userId)
            ? { ...c, memberIds: [...c.memberIds, userId] }
            : c
        )
      );
    },
    []
  );

  const removeGroupMember = useCallback(
    (conversationId: string, userId: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId && c.type === "group"
            ? { ...c, memberIds: c.memberIds.filter((id) => id !== userId) }
            : c
        )
      );
    },
    []
  );

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations]
  );

  const getConversationMessages = useCallback(
    (id: string) => messages[id] ?? [],
    [messages]
  );

  const getLastMessage = useCallback(
    (conversationId: string) => {
      const msgs = messages[conversationId] ?? [];
      return msgs[msgs.length - 1];
    },
    [messages]
  );

  const getUser = useCallback(
    (id: string): AppUser | undefined => {
      if (currentUser?.id === id) return currentUser;
      return SEED_USERS.find((u) => u.id === id);
    },
    [currentUser]
  );

  const getPendingReceivedRequests = useCallback(
    () =>
      friendRequests.filter(
        (r) => r.toId === currentUser?.id && r.status === "pending"
      ),
    [friendRequests, currentUser]
  );

  const getPendingSentRequests = useCallback(
    () =>
      friendRequests.filter(
        (r) => r.fromId === currentUser?.id && r.status === "pending"
      ),
    [friendRequests, currentUser]
  );

  const isFriend = useCallback(
    (userId: string) =>
      friendRequests.some(
        (r) =>
          r.status === "accepted" &&
          ((r.fromId === currentUser?.id && r.toId === userId) ||
            (r.toId === currentUser?.id && r.fromId === userId))
      ),
    [friendRequests, currentUser]
  );

  const hasPendingRequest = useCallback(
    (toId: string) =>
      friendRequests.some(
        (r) =>
          r.fromId === currentUser?.id &&
          r.toId === toId &&
          r.status === "pending"
      ),
    [friendRequests, currentUser]
  );

  const getUnreadCount = useCallback(() => 0, []);

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        allUsers: SEED_USERS,
        friendRequests,
        friends,
        conversations,
        messages,
        isLoaded,
        setCurrentUser,
        searchUsers,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        cancelFriendRequest,
        getOrCreateDirectConversation,
        sendMessage,
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
