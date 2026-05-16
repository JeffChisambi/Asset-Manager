import { Post } from "@/types/profile";

export const MOCK_POSTS: Post[] = [
  {
    id: "post_1",
    userId: "user_1",
    content:
      "Just copped these Air Max 90s! The colorway is insane 🔥 Worth every penny.",
    likes: 284,
    comments: 42,
    shares: 18,
    isLiked: false,
    isSaved: false,
    createdAt: "2h ago",
    tags: ["Nike", "AirMax", "Sneakers"],
    productTag: { name: "Nike Air Max 90", price: 225.0, brand: "Nike" },
  },
  {
    id: "post_2",
    userId: "user_1",
    content:
      "My collection is growing 😭 Need a bigger shelf. Which ones should I wear today?",
    likes: 1024,
    comments: 138,
    shares: 64,
    isLiked: true,
    isSaved: true,
    createdAt: "1d ago",
    tags: ["Collection", "SneakerWall"],
  },
  {
    id: "post_3",
    userId: "user_1",
    content:
      "Air Jordan 3 just dropped and I managed to get a pair! StockX price is already 3x retail 🚀",
    likes: 3402,
    comments: 287,
    shares: 512,
    isLiked: false,
    isSaved: false,
    createdAt: "3d ago",
    tags: ["Jordan", "AirJordan3", "Hype"],
    productTag: { name: "Air Jordan 3", price: 200.0, brand: "Jordan" },
  },
  {
    id: "post_4",
    userId: "user_2",
    content: "Yeezy 350 V2 — the GOAT colourway. Change my mind.",
    likes: 892,
    comments: 104,
    shares: 33,
    isLiked: false,
    isSaved: false,
    createdAt: "5h ago",
    tags: ["Yeezy", "Adidas"],
    productTag: { name: "Yeezy 350 V2", price: 320.0, brand: "Adidas" },
  },
  {
    id: "post_5",
    userId: "user_3",
    content: "Top 5 Jordan 1 colourways of all time — thread 🧵",
    likes: 12480,
    comments: 1820,
    shares: 3240,
    isLiked: true,
    isSaved: true,
    createdAt: "1w ago",
    tags: ["Jordan1", "GOAT", "Thread"],
  },
  {
    id: "post_6",
    userId: "user_1",
    content:
      "Finally got the Nike Dunk Low Panda restocked! Size 10 available right now on SNKRS. Go go go!",
    likes: 741,
    comments: 93,
    shares: 204,
    isLiked: false,
    isSaved: false,
    createdAt: "5d ago",
    tags: ["Nike", "DunkLow", "Panda"],
    productTag: { name: "Nike Dunk Low Panda", price: 110.0, brand: "Nike" },
  },
];

export function getPostsByUser(userId: string): Post[] {
  return MOCK_POSTS.filter((p) => p.userId === userId);
}
