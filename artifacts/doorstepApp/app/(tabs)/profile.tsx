import React, { useEffect } from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { useRouter } from "expo-router";
import { useChat } from "@/context/ChatContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";

export default function ProfileTab() {
  const router = useRouter();
  const colors = useColors();
  const { currentUser, isLoaded } = useChat();

  // Ensure the profile service fallback cache is always seeded with the
  // current user's data from ChatContext (handles fresh logins and migrations).
  useEffect(() => {
    if (!currentUser) return;
    AsyncStorage.setItem(
      "doorstep_current_user",
      JSON.stringify(currentUser),
    ).catch(() => {});
  }, [currentUser]);

  if (!isLoaded || !currentUser) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {!isLoaded && (
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading profile…
          </Text>
        )}
      </View>
    );
  }

  return (
    <ProfileScreen
      userId={currentUser.id}
      onEditPress={() => router.push("/profile/edit")}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: "#333",
    fontFamily: "Inter_500Medium",
  },
  errorText: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Inter_500Medium",
  },
});
