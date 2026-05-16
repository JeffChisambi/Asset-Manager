export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  coverColor: string;
  bio: string;
  location: string;
  website: string;
  joinDate: string;
  isVerified: boolean;
  isOnline: boolean;
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  postsCount: number;
  title: string;
  shoeSize: string;
  favoriteBrand: string;
  mutualFriendsCount: number;
  profileCompletion: number;
}

export type FriendshipStatus =
  | "none"
  | "friends"
  | "request_sent"
  | "request_received";

export interface Post {
  id: string;
  userId: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  tags: string[];
  productTag?: {
    name: string;
    price: number;
    brand: string;
  };
}

export type ProfileTab =
  | "posts"
  | "collection"
  | "wishlist"
  | "reviews"
  | "about";
