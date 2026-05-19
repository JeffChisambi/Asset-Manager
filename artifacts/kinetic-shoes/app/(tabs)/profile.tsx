import React from "react";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { useRouter } from "expo-router";
import { useChat } from "@/context/ChatContext";

export default function ProfileTab() {
  const router = useRouter();
  const { currentUser } = useChat();
  
  if (!currentUser) return null;

  return (
    <ProfileScreen 
      userId={currentUser.id} 
      onEditPress={() => router.push("/profile/edit")}
    />
  );
}
