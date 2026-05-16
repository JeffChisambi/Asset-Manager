import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { memo, useEffect } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { FollowButton } from "./FollowButton";
import { FriendButton } from "./FriendButton";
import { useFollow } from "@/hooks/profile/useFollow";
import { useFriendship } from "@/hooks/profile/useFriendship";
import { User } from "@/types/profile";
import { useColors } from "@/hooks/useColors";

const COVER_HEIGHT = 160;
const AVATAR_SIZE = 84;

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

interface ProfileCompletionBarProps {
  percent: number;
}

const ProfileCompletionBar = memo(({ percent }: ProfileCompletionBarProps) => {
  const colors = useColors();
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(percent, { duration: 800 });
  }, [percent]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as any,
  }));

  return (
    <View style={styles.completionContainer}>
      <View style={styles.completionRow}>
        <Text style={[styles.completionLabel, { color: colors.mutedForeground }]}>
          Profile strength
        </Text>
        <Text style={[styles.completionPct, { color: colors.primary }]}>
          {percent}%
        </Text>
      </View>
      <View
        style={[styles.completionTrack, { backgroundColor: colors.border }]}
      >
        <Animated.View
          style={[
            styles.completionFill,
            barStyle,
            { backgroundColor: colors.primary },
          ]}
        />
      </View>
    </View>
  );
});

interface ProfileHeaderProps {
  user: User;
  isOwn: boolean;
  onEditPress?: () => void;
  onSharePress?: () => void;
  onMessagePress?: () => void;
  onMorePress?: () => void;
}

export const ProfileHeader = memo(
  ({
    user,
    isOwn,
    onEditPress,
    onSharePress,
    onMessagePress,
    onMorePress,
  }: ProfileHeaderProps) => {
    const colors = useColors();
    const { isFollowing, toggle: toggleFollow } = useFollow(user.id);
    const friendship = useFriendship(user.id);

    const avatarScale = useSharedValue(0.8);
    const avatarOpacity = useSharedValue(0);

    useEffect(() => {
      avatarScale.value = withSpring(1, { damping: 12 });
      avatarOpacity.value = withTiming(1, { duration: 400 });
    }, []);

    const avatarStyle = useAnimatedStyle(() => ({
      transform: [{ scale: avatarScale.value }],
      opacity: avatarOpacity.value,
    }));

    const handleLink = () => {
      if (user.website) {
        const url = user.website.startsWith("http")
          ? user.website
          : `https://${user.website}`;
        Linking.openURL(url);
      }
    };

    const haptic = () => {
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
      <View>
        {/* Cover */}
        <View
          style={[styles.cover, { backgroundColor: user.coverColor }]}
        >
          <View style={styles.coverOverlay} />
          {!isOwn && (
            <View style={styles.coverMutualBadge}>
              <Ionicons name="people-outline" size={12} color="#fff" />
              <Text style={styles.coverMutualText}>
                {user.mutualFriendsCount} mutual friends
              </Text>
            </View>
          )}
        </View>

        {/* Avatar row */}
        <View style={styles.avatarRow}>
          <Animated.View style={[styles.avatarWrap, avatarStyle]}>
            <View
              style={[styles.avatarCircle, { backgroundColor: user.avatarColor }]}
            >
              <Text style={styles.initials}>{getInitials(user.displayName)}</Text>
            </View>
            {user.isOnline && <View style={styles.onlineDot} />}
          </Animated.View>

          {/* Own profile buttons */}
          {isOwn ? (
            <View style={styles.ownActions}>
              <Pressable
                style={[
                  styles.editBtn,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
                onPress={() => { haptic(); onEditPress?.(); }}
              >
                <Feather name="edit-2" size={14} color={colors.foreground} />
                <Text style={[styles.editBtnLabel, { color: colors.foreground }]}>
                  Edit Profile
                </Text>
              </Pressable>
              <Pressable
                style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => { haptic(); onSharePress?.(); }}
              >
                <Feather name="share-2" size={16} color={colors.foreground} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.ownActions}>
              <FollowButton
                isFollowing={isFollowing}
                onPress={toggleFollow}
              />
              <Pressable
                style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => { haptic(); onMessagePress?.(); }}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color={colors.foreground}
                />
              </Pressable>
              <Pressable
                style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => { haptic(); onMorePress?.(); }}
              >
                <Feather name="more-horizontal" size={16} color={colors.foreground} />
              </Pressable>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          {/* Name + verified */}
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {user.displayName}
            </Text>
            {user.isVerified && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={18}
                color={colors.primary}
              />
            )}
          </View>

          <Text style={[styles.username, { color: colors.mutedForeground }]}>
            @{user.username}
          </Text>

          <Text style={[styles.title, { color: colors.mutedForeground }]}>
            {user.title}
          </Text>

          {user.bio ? (
            <Text style={[styles.bio, { color: colors.foreground }]}>
              {user.bio}
            </Text>
          ) : null}

          {/* Meta row */}
          <View style={styles.metaRow}>
            {user.location ? (
              <View style={styles.metaItem}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {user.location}
                </Text>
              </View>
            ) : null}
            {user.website ? (
              <Pressable style={styles.metaItem} onPress={handleLink}>
                <Feather name="link" size={13} color={colors.primary} />
                <Text style={[styles.metaText, { color: colors.primary }]}>
                  {user.website}
                </Text>
              </Pressable>
            ) : null}
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={colors.mutedForeground}
              />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                Joined {user.joinDate}
              </Text>
            </View>
          </View>

          {/* Shoe info row */}
          <View style={styles.shoeRow}>
            <View
              style={[styles.shoeTag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <MaterialCommunityIcons
                name="shoe-sneaker"
                size={13}
                color={colors.primary}
              />
              <Text style={[styles.shoeTagText, { color: colors.foreground }]}>
                {user.shoeSize}
              </Text>
            </View>
            <View
              style={[styles.shoeTag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Ionicons name="star-outline" size={13} color={colors.primary} />
              <Text style={[styles.shoeTagText, { color: colors.foreground }]}>
                {user.favoriteBrand}
              </Text>
            </View>
          </View>

          {/* Friend request banner */}
          {!isOwn && friendship.status === "request_received" && (
            <View
              style={[
                styles.requestBanner,
                { backgroundColor: colors.secondary, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.requestText, { color: colors.foreground }]}>
                Sent you a friend request
              </Text>
              <View style={styles.requestActions}>
                <FriendButton
                  status={friendship.status}
                  onSendRequest={friendship.sendRequest}
                  onCancelRequest={friendship.cancelRequest}
                  onAccept={friendship.accept}
                  onUnfriend={friendship.unfriend}
                />
              </View>
            </View>
          )}

          {/* Other user — friend button row */}
          {!isOwn && friendship.status !== "request_received" && (
            <View style={styles.friendRow}>
              <FriendButton
                status={friendship.status}
                onSendRequest={friendship.sendRequest}
                onCancelRequest={friendship.cancelRequest}
                onAccept={friendship.accept}
                onUnfriend={friendship.unfriend}
              />
            </View>
          )}

          {/* Profile completion (own only) */}
          {isOwn && (
            <ProfileCompletionBar percent={user.profileCompletion} />
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  cover: {
    height: COVER_HEIGHT,
    position: "relative",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  coverMutualBadge: {
    position: "absolute",
    bottom: 10,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  coverMutualText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: -(AVATAR_SIZE / 2),
    marginBottom: 4,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  initials: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  ownActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  editBtnLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  displayName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  username: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  bio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  shoeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  shoeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  shoeTagText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  requestBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  requestText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  requestActions: {
    flexDirection: "row",
  },
  friendRow: {
    marginTop: 12,
    flexDirection: "row",
  },
  completionContainer: {
    marginTop: 14,
    gap: 6,
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completionLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  completionPct: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  completionTrack: {
    height: 5,
    borderRadius: 100,
    overflow: "hidden",
  },
  completionFill: {
    height: "100%",
    borderRadius: 100,
  },
});
