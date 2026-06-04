import { getPostsByUser } from "@/mock/posts";
import { User, Post } from "@/types/profile";
import { SEED_USERS } from "@/context/ChatContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SupabaseProfileRepository,
  IProfileRepository,
} from "./profile.repository";

import { SupabasePostRepository } from "./post.repository";

export abstract class BaseProfileService {
  protected repository: IProfileRepository;

  constructor(repository: IProfileRepository) {
    this.repository = repository;
  }

  abstract getUser(userId: string): Promise<User | null>;
  abstract updateProfile(userId: string, data: Partial<User>): Promise<void>;
  abstract createInitialProfile(
    userId: string,
    data: Partial<User>,
  ): Promise<void>;

  abstract getPosts(userId: string): Promise<Post[]>;
  abstract createPost(
    userId: string,
    content: string,
    tags: string[],
    mediaFiles?: { uri: string; name: string }[],
  ): Promise<Post>;
  abstract followUser(userId: string): Promise<void>;
  abstract unfollowUser(userId: string): Promise<void>;
  abstract sendFriendRequest(userId: string): Promise<void>;
  abstract cancelFriendRequest(userId: string): Promise<void>;
  abstract acceptFriendRequest(userId: string): Promise<void>;
  abstract unfriend(userId: string): Promise<void>;
}

// ─── Local persistence helpers ────────────────────────────────────────────────
// All profile data (text + photos) is written to AsyncStorage so the app
// works even when the Supabase `profiles` table doesn't exist yet.
// Supabase is attempted as a secondary write; errors are swallowed silently.

function profileKey(userId: string) {
  return `profile_data_${userId}`;
}

async function loadLocalProfile(userId: string): Promise<Partial<User> | null> {
  try {
    const raw = await AsyncStorage.getItem(profileKey(userId));
    return raw ? (JSON.parse(raw) as Partial<User>) : null;
  } catch {
    return null;
  }
}

async function saveLocalProfile(
  userId: string,
  data: Partial<User>,
): Promise<void> {
  try {
    // Merge with any existing local data so a partial update doesn't wipe fields
    const existing = (await loadLocalProfile(userId)) ?? {};
    const merged: Partial<User> = { ...existing, ...data };
    await AsyncStorage.setItem(profileKey(userId), JSON.stringify(merged));
  } catch {}
}

// ─── ProfileService implementation ───────────────────────────────────────────

export class ProfileServiceImpl extends BaseProfileService {
  async getUser(userId: string): Promise<User | null> {
    let user: User | null = null;

    // 1. Try Supabase (best-effort; fails gracefully when table doesn't exist)
    try {
      user = await this.repository.getUserProfile(userId);
    } catch {
      // Intentionally suppressed — Supabase may not have the table yet
    }

    // 2. Fallback → seed / bot users
    if (!user) {
      const seedUser = SEED_USERS.find((u) => u.id === userId);
      if (seedUser) {
        user = {
          id: seedUser.id,
          username: seedUser.username,
          displayName: seedUser.displayName,
          avatarColor: seedUser.avatarColor,
          coverColor: "#1A2456",
          bio: seedUser.bio ?? "",
          location: "",
          website: "",
          joinDate: "Recently",
          isVerified: false,
          isOnline: true,
          followersCount: 154,
          followingCount: 89,
          friendsCount: 12,
          postsCount: 0,
          title: "Member",
          shoeSize: "",
          favoriteBrand: "",
          mutualFriendsCount: 0,
          profileCompletion: 80,
        };
      }
    }

    // 3. Fallback → cached chat session (has id, displayName, username, avatarColor, bio)
    if (!user) {
      try {
        const raw = await AsyncStorage.getItem("kinetic_chat_v3");
        if (raw) {
          const state = JSON.parse(raw);
          if (state.currentUser && state.currentUser.id === userId) {
            const u = state.currentUser;
            user = {
              id: u.id,
              username: u.username || "",
              displayName: u.displayName || "",
              avatarColor: u.avatarColor || "#13B734",
              coverColor: "#1A2456",
              bio: u.bio || "",
              location: "",
              website: "",
              joinDate: "Today",
              isVerified: false,
              isOnline: true,
              followersCount: 0,
              followingCount: 0,
              friendsCount: 0,
              postsCount: 0,
              title: "Member",
              shoeSize: "",
              favoriteBrand: "",
              mutualFriendsCount: 0,
              profileCompletion: 60,
            };
          }
        }
      } catch {}
    }

    // 4. Overlay locally-saved profile edits — these always win because they
    //    reflect the most recent save from EditProfileScreen even when Supabase
    //    is unavailable or the table doesn't exist yet.
    const localData = await loadLocalProfile(userId);
    if (localData) {
      if (user) {
        // Overlay every defined local field onto whatever we got above
        user = {
          ...user,
          ...(localData.displayName !== undefined && {
            displayName: localData.displayName,
          }),
          ...(localData.username !== undefined && {
            username: localData.username,
          }),
          ...(localData.bio !== undefined && { bio: localData.bio }),
          ...(localData.location !== undefined && {
            location: localData.location,
          }),
          ...(localData.website !== undefined && {
            website: localData.website,
          }),
          ...(localData.avatarColor !== undefined && {
            avatarColor: localData.avatarColor,
          }),
          ...(localData.coverColor !== undefined && {
            coverColor: localData.coverColor,
          }),
          ...(localData.avatarUrl !== undefined && {
            avatarUrl: localData.avatarUrl,
          }),
          ...(localData.coverUrl !== undefined && {
            coverUrl: localData.coverUrl,
          }),
          ...(localData.title !== undefined && { title: localData.title }),
        };
      } else {
        // We have local data but no base user — reconstruct a minimal profile
        user = {
          id: userId,
          username: localData.username || "",
          displayName: localData.displayName || "User",
          avatarColor: localData.avatarColor || "#13B734",
          coverColor: localData.coverColor || "#1A2456",
          avatarUrl: localData.avatarUrl,
          coverUrl: localData.coverUrl,
          bio: localData.bio || "",
          location: localData.location || "",
          website: localData.website || "",
          joinDate: "Today",
          isVerified: false,
          isOnline: true,
          followersCount: 0,
          followingCount: 0,
          friendsCount: 0,
          postsCount: 0,
          title: localData.title || "Member",
          shoeSize: "",
          favoriteBrand: "",
          mutualFriendsCount: 0,
          profileCompletion: 70,
        };
      }
    }

    return user;
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<void> {
    // Step 1 — always save locally first (guaranteed, works offline)
    await saveLocalProfile(userId, data);

    // Step 2 — attempt Supabase sync (best-effort; ignored when table missing)
    try {
      await this.repository.updateProfile(userId, data);
    } catch {
      // Intentionally suppressed — local save above is the source of truth
    }
  }

  async createInitialProfile(
    userId: string,
    data: Partial<User>,
  ): Promise<void> {
    await saveLocalProfile(userId, data);
    try {
      await this.repository.createProfile(userId, data);
    } catch {
      // Intentionally suppressed
    }
  }

  async getPosts(userId: string): Promise<Post[]> {
    const postRepo = new SupabasePostRepository();

    // 1. Try Supabase with 5 second timeout
    try {
      const postsPromise = postRepo.getPostsByUser(userId);
      const timeoutPromise = new Promise<Post[]>((_, reject) =>
        setTimeout(() => reject(new Error("Supabase timeout")), 5000),
      );
      const posts = await Promise.race([postsPromise, timeoutPromise]);
      if (posts && posts.length > 0) {
        return posts;
      }
    } catch (err) {
      console.warn(
        "Supabase fetch posts failed or timed out, falling back to cache/mock",
        err,
      );
    }

    // 2. Try AsyncStorage cache
    try {
      const cachedRaw = await AsyncStorage.getItem(`profile_posts_${userId}`);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as Post[];
        if (cached.length > 0) return cached;
      }
    } catch {}

    // 3. Fallback to mock posts
    await new Promise((r) => setTimeout(r, 200));
    return getPostsByUser(userId);
  }

  async createPost(
    userId: string,
    content: string,
    tags: string[],
    mediaFiles?: { uri: string; name: string }[],
  ): Promise<Post> {
    const postRepo = new SupabasePostRepository();
    const newPost = await postRepo.createPost(
      userId,
      {
        content,
        tags,
        likes: 0,
        comments: 0,
        shares: 0,
        isLiked: false,
        isSaved: false,
      },
      mediaFiles,
    );

    // Also save locally in AsyncStorage for fallback / local caching
    try {
      const currentLocalPostsRaw = await AsyncStorage.getItem(
        `profile_posts_${userId}`,
      );
      const currentLocalPosts: Post[] = currentLocalPostsRaw
        ? JSON.parse(currentLocalPostsRaw)
        : [];
      await AsyncStorage.setItem(
        `profile_posts_${userId}`,
        JSON.stringify([newPost, ...currentLocalPosts]),
      );
    } catch (err) {
      console.warn("Error caching new post locally:", err);
    }

    return newPost;
  }

  async followUser(_userId: string): Promise<void> {}
  async unfollowUser(_userId: string): Promise<void> {}
  async sendFriendRequest(_userId: string): Promise<void> {}
  async cancelFriendRequest(_userId: string): Promise<void> {}
  async acceptFriendRequest(_userId: string): Promise<void> {}
  async unfriend(_userId: string): Promise<void> {}

  /** Diagnose bucket connectivity — call from a dev button or onMount. */
  async diagnoseBucket(): Promise<string> {
    return SupabasePostRepository.diagnoseBucket();
  }
}

const repository = new SupabaseProfileRepository();
export const ProfileService = new ProfileServiceImpl(repository);
