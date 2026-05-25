import { supabase } from "@/lib/supabase";
import { User } from "@/types/profile";

export interface IProfileRepository {
  getUserProfile(userId: string): Promise<User | null>;
  createProfile(userId: string, data: Partial<User>): Promise<void>;
  updateProfile(userId: string, data: Partial<User>): Promise<void>;
}

export class SupabaseProfileRepository implements IProfileRepository {
  async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Throw a clean error so the service layer can catch and fall back locally.
    // Avoid console.warn/error here — the service owns logging decisions.
    if (error || !data) {
      throw new Error(error?.message ?? "Profile not found");
    }

    return {
      id: data.id,
      username: data.username || '',
      displayName: data.display_name || '',
      avatarColor: data.avatar_color || '#13B734',
      coverColor: data.cover_color || '#1A2456',
      avatarUrl: data.avatar_url || undefined,
      coverUrl: data.cover_url || undefined,
      bio: data.bio || '',
      location: data.location || '',
      website: data.website || '',
      joinDate: data.join_date || new Date().toISOString(),
      isVerified: data.is_verified || false,
      isOnline: data.is_online || false,
      followersCount: data.followers_count || 0,
      followingCount: data.following_count || 0,
      friendsCount: data.friends_count || 0,
      postsCount: data.posts_count || 0,
      title: data.title || '',
      shoeSize: data.shoe_size || '',
      favoriteBrand: data.favorite_brand || '',
      mutualFriendsCount: data.mutual_friends_count || 0,
      profileCompletion: data.profile_completion || 0,
    };
  }

  async createProfile(userId: string, data: Partial<User>): Promise<void> {
    const payload: Record<string, any> = {
      id: userId,
      username: data.username || '',
      display_name: data.displayName || '',
      avatar_color: data.avatarColor || '#13B734',
      bio: data.bio || '',
      location: data.location || '',
      website: data.website || '',
      title: data.title || '',
      shoe_size: data.shoeSize || '',
      favorite_brand: data.favoriteBrand || '',
      join_date: new Date().toISOString(),
    };
    if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
    if (data.coverUrl !== undefined) payload.cover_url = data.coverUrl;

    const { error } = await supabase.from('profiles').insert([payload]);
    if (error) throw new Error(error.message);
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<void> {
    const payload: Record<string, any> = {};
    if (data.username !== undefined) payload.username = data.username;
    if (data.displayName !== undefined) payload.display_name = data.displayName;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.location !== undefined) payload.location = data.location;
    if (data.website !== undefined) payload.website = data.website;
    if (data.title !== undefined) payload.title = data.title;
    if (data.shoeSize !== undefined) payload.shoe_size = data.shoeSize;
    if (data.favoriteBrand !== undefined) payload.favorite_brand = data.favoriteBrand;
    if (data.avatarColor !== undefined) payload.avatar_color = data.avatarColor;
    if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
    if (data.coverUrl !== undefined) payload.cover_url = data.coverUrl;

    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
    if (error) throw new Error(error.message);
  }
}
