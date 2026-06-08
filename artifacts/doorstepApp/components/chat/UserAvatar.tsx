import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";

interface UserAvatarProps {
  displayName: string;
  avatarColor: string;
  avatarUrl?: string;
  size?: number;
  onPress?: () => void;
}

export function UserAvatar({ displayName, avatarColor, avatarUrl, size = 44, onPress }: UserAvatarProps) {
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const fontSize = size * 0.38;

  const content = avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarColor,
      }}
    />
  ) : (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: avatarColor,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
});
