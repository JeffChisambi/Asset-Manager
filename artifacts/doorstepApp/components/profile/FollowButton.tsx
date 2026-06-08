import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

interface FollowButtonProps {
  isFollowing: boolean;
  onPress: () => void;
  isLoading?: boolean;
}

export const FollowButton = memo(
  ({ isFollowing, onPress, isLoading }: FollowButtonProps) => {
    const colors = useColors();
    const scale = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.94, { damping: 10 });
    };
    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 10 });
    };

    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isLoading}
      >
        <Animated.View
          style={[
            styles.btn,
            animStyle,
            {
              backgroundColor: isFollowing ? "transparent" : colors.primary,
              borderColor: isFollowing ? colors.border : colors.primary,
            },
          ]}
        >
          <Ionicons
            name={isFollowing ? "checkmark" : "add"}
            size={16}
            color={isFollowing ? colors.foreground : "#fff"}
          />
          <Text
            style={[
              styles.label,
              { color: isFollowing ? colors.foreground : "#fff" },
            ]}
          >
            {isFollowing ? "Following" : "Follow"}
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
