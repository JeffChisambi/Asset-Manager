import { User } from "@/types/profile";

export const CURRENT_USER_ID = "user_1";

export const MOCK_USERS: Record<string, User> = {
  user_1: {
    id: "user_1",
    username: "doorstep_user",
    displayName: "Doorstep User",
    avatarColor: "#13B734",
    coverColor: "#1A2456",
    bio: "Discovering local merchants and services on Doorstep.",
    location: "Lilongwe",
    website: "doorstep.app",
    joinDate: "March 2023",
    isVerified: true,
    isOnline: true,
    followersCount: 0,
    followingCount: 0,
    friendsCount: 0,
    postsCount: 0,
    title: "Doorstep Member",
    shoeSize: "",
    favoriteBrand: "",
    mutualFriendsCount: 0,
    profileCompletion: 92,
  },
};

export const SUGGESTED_USER_IDS: string[] = [];
