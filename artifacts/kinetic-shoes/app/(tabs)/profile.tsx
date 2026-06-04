import React from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { useRouter } from "expo-router";
import { useChat } from "@/context/ChatContext";

export default function ProfileTab() {
  const router = useRouter();
  const { currentUser, isLoaded } = useChat();

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#13B734" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          Unable to load your profile. Please restart the app or sign in again.
        </Text>
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
