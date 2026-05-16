import { MOCK_USERS } from "@/mock/users";
import { getPostsByUser } from "@/mock/posts";
import { User, Post } from "@/types/profile";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const ProfileService = {
  async getUser(userId: string): Promise<User | null> {
    await delay(300);
    return MOCK_USERS[userId] ?? null;
  },

  async getPosts(userId: string): Promise<Post[]> {
    await delay(200);
    return getPostsByUser(userId);
  },

  async followUser(_userId: string): Promise<void> {
    await delay(150);
  },

  async unfollowUser(_userId: string): Promise<void> {
    await delay(150);
  },

  async sendFriendRequest(_userId: string): Promise<void> {
    await delay(150);
  },

  async cancelFriendRequest(_userId: string): Promise<void> {
    await delay(150);
  },

  async acceptFriendRequest(_userId: string): Promise<void> {
    await delay(150);
  },

  async unfriend(_userId: string): Promise<void> {
    await delay(150);
  },
};
