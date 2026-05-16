import React from "react";
import { CURRENT_USER_ID } from "@/mock/users";
import { ProfileScreen } from "@/components/profile/ProfileScreen";

export default function ProfileTab() {
  return <ProfileScreen userId={CURRENT_USER_ID} />;
}
