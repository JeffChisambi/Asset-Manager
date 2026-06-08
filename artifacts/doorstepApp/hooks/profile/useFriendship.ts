import { useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { FriendshipStatus } from "@/types/profile";
import { ProfileService } from "@/services/profile/profile.service";

export function useFriendship(
  userId: string,
  initialStatus: FriendshipStatus = "none"
) {
  const [status, setStatus] = useState<FriendshipStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const haptic = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const sendRequest = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setStatus("request_sent");
    haptic();
    try {
      await ProfileService.sendFriendRequest(userId);
    } catch {
      setStatus("none");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userId]);

  const cancelRequest = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    const prev = status;
    setStatus("none");
    try {
      await ProfileService.cancelFriendRequest(userId);
    } catch {
      setStatus(prev);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userId, status]);

  const accept = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setStatus("friends");
    haptic();
    try {
      await ProfileService.acceptFriendRequest(userId);
    } catch {
      setStatus("request_received");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userId]);

  const unfriend = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setStatus("none");
    try {
      await ProfileService.unfriend(userId);
    } catch {
      setStatus("friends");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userId]);

  return { status, sendRequest, cancelRequest, accept, unfriend, isLoading };
}
