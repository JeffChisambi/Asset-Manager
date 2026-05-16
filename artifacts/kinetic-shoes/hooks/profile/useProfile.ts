import { useState, useEffect, useCallback } from "react";
import { User, Post } from "@/types/profile";
import { ProfileService } from "@/services/profile/profile.service";

interface UseProfileReturn {
  user: User | null;
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProfile(userId: string): UseProfileReturn {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [userData, postsData] = await Promise.all([
        ProfileService.getUser(userId),
        ProfileService.getPosts(userId),
      ]);
      if (!userData) {
        setError("User not found");
      } else {
        setUser(userData);
        setPosts(postsData);
      }
    } catch {
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { user, posts, isLoading, error, refresh: load };
}
