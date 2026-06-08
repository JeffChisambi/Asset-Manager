import { useState, useEffect, useCallback, useRef } from "react";
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

  // Track whether we already have data so re-fetches (e.g. after edit)
  // don't show the loading skeleton — they update silently in the background.
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    // Only show the full loading state on the very first fetch.
    if (!hasDataRef.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [userData, postsData] = await Promise.all([
        ProfileService.getUser(userId),
        ProfileService.getPosts(userId),
      ]);

      if (!userData) {
        setError("User not found");
      } else {
        hasDataRef.current = true;
        setUser(userData);
        setPosts(postsData);
      }
    } catch {
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Reset when the userId changes (e.g. viewing a different user's profile).
  useEffect(() => {
    hasDataRef.current = false;
    setUser(null);
    setPosts([]);
    setError(null);
    load();
  }, [load]);

  return { user, posts, isLoading, error, refresh: load };
}
