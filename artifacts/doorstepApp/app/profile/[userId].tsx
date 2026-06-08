import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ProfileScreen } from "@/components/profile/ProfileScreen";

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();

  return (
    <ProfileScreen
      userId={userId ?? ""}
      showBackButton
      onBack={() => router.back()}
      onEditPress={() => router.push("/profile/edit")}
    />
  );
}
