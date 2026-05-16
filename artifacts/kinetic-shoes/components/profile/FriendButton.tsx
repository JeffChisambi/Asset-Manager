import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { FriendshipStatus } from "@/types/profile";
import { useColors } from "@/hooks/useColors";

interface FriendButtonProps {
  status: FriendshipStatus;
  onSendRequest: () => void;
  onCancelRequest: () => void;
  onAccept: () => void;
  onUnfriend: () => void;
  isLoading?: boolean;
}

export const FriendButton = memo(
  ({
    status,
    onSendRequest,
    onCancelRequest,
    onAccept,
    onUnfriend,
    isLoading,
  }: FriendButtonProps) => {
    const colors = useColors();
    const scale = useSharedValue(1);

    const config: { icon: string; label: string; action: () => void } =
      status === "friends"
        ? { icon: "people", label: "Friends", action: onUnfriend }
        : status === "request_sent"
          ? { icon: "time-outline", label: "Requested", action: onCancelRequest }
          : status === "request_received"
            ? { icon: "person-add", label: "Accept", action: onAccept }
            : { icon: "person-add-outline", label: "Add Friend", action: onSendRequest };

    const isFilled = status === "friends" || status === "request_received";

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () =>
      (scale.value = withSpring(0.94, { damping: 10 }));
    const handlePressOut = () => (scale.value = withSpring(1, { damping: 10 }));

    return (
      <Pressable
        onPress={config.action}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isLoading}
      >
        <Animated.View
          style={[
            styles.btn,
            animStyle,
            {
              backgroundColor: isFilled ? colors.secondary : "transparent",
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name={config.icon as any}
            size={16}
            color={colors.foreground}
          />
          <Text style={[styles.label, { color: colors.foreground }]}>
            {config.label}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
