import { Post } from "@/types/profile";

export const MOCK_POSTS: Post[] = [];

export function getPostsByUser(userId: string): Post[] {
  return MOCK_POSTS.filter((p) => p.userId === userId);
}
