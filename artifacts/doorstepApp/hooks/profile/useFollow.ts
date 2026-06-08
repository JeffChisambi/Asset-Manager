import { useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { ProfileService } from "@/services/profile/profile.service";

export function useFollow(userId: string, initialFollowing = false) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    const next = !isFollowing;
    setIsFollowing(next);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      if (next) {
        await ProfileService.followUser(userId);
      } else {
        await ProfileService.unfollowUser(userId);
      }
    } catch {
      setIsFollowing(!next);
    } finally {
      setIsLoading(false);
    }
  }, [isFollowing, isLoading, userId]);

  return { isFollowing, toggle, isLoading };
}
