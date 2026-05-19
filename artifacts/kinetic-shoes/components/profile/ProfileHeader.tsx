import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { memo, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FollowButton } from "./FollowButton";
import { FriendButton } from "./FriendButton";
import { useFollow } from "@/hooks/profile/useFollow";
import { useFriendship } from "@/hooks/profile/useFriendship";
import { User } from "@/types/profile";
import { useColors } from "@/hooks/useColors";

const COVER_HEIGHT = 200;
const AVATAR_SIZE = 90;

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
      <View style={[styles.completionTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.completionFill,
            { width: `${percent}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
    </View>
  );
});

interface PhotoViewerProps {
  visible: boolean;
  uri?: string;
  fallbackColor?: string;
  initials?: string;
  onClose: () => void;
}

const PhotoViewer = memo(({ visible, uri, fallbackColor, initials, onClose }: PhotoViewerProps) => {
  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.photoViewerBackdrop} onPress={onClose}>
        <TouchableOpacity style={styles.photoViewerClose} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.photoViewerImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.photoViewerFallback, { backgroundColor: fallbackColor || "#4A80F0" }]}>
            <Text style={styles.photoViewerInitials}>{initials || "?"}</Text>
          </View>
        )}
      </Pressable>
    </Modal>
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

    const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);
    const [coverViewerVisible, setCoverViewerVisible] = useState(false);

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

    const handleShare = async () => {
      haptic();
      if (onSharePress) {
        onSharePress();
        return;
      }
      try {
        const profileUrl = `https://kinetic.app/profile/${user.username}`;
        await Share.share({
          title: `${user.displayName} on Kinetic`,
          message: `Check out ${user.displayName}'s profile on Kinetic Shoes 👟\n${profileUrl}`,
          url: profileUrl,
        });
      } catch {}
    };

    return (
      <View>
        {/* Cover photo — tappable to view fullscreen */}
        <Pressable
          onPress={() => {
            haptic();
            setCoverViewerVisible(true);
          }}
          style={[styles.cover, { backgroundColor: user.coverColor }]}
        >
          {user.coverUrl ? (
            <Image
              source={{ uri: user.coverUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.coverOverlay} />

          {/* Tap-to-view hint */}
          <View style={styles.coverViewHint}>
            <Ionicons name="expand-outline" size={13} color="rgba(255,255,255,0.8)" />
          </View>

          {!isOwn && (
            <View style={styles.coverMutualBadge}>
              <Ionicons name="people-outline" size={12} color="#fff" />
              <Text style={styles.coverMutualText}>
                {user.mutualFriendsCount} mutual
              </Text>
            </View>
          )}
        </Pressable>

        {/* Avatar row */}
        <View style={styles.avatarRow}>
          {/* Avatar — tappable to view fullscreen */}
          <Pressable
            onPress={() => {
              haptic();
              setAvatarViewerVisible(true);
            }}
            style={styles.avatarWrap}
          >
            <View style={[styles.avatarCircle, { backgroundColor: user.avatarColor }]}>
              {user.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.initials}>{getInitials(user.displayName)}</Text>
              )}
            </View>
            {user.isOnline && <View style={styles.onlineDot} />}
            {/* Camera icon overlay hint */}
            <View style={styles.avatarViewHint}>
              <Ionicons name="eye-outline" size={10} color="#fff" />
            </View>
          </Pressable>

          {/* Action buttons */}
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
                onPress={handleShare}
              >
                <Feather name="share-2" size={16} color={colors.foreground} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.ownActions}>
              <FollowButton isFollowing={isFollowing} onPress={toggleFollow} />
              <Pressable
                style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => { haptic(); onMessagePress?.(); }}
              >
                <Ionicons name="chatbubble-outline" size={16} color={colors.foreground} />
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

          {user.title ? (
            <Text style={[styles.title, { color: colors.mutedForeground }]}>
              {user.title}
            </Text>
          ) : null}

          {user.bio ? (
            <Text style={[styles.bio, { color: colors.foreground }]}>
              {user.bio}
            </Text>
          ) : null}

          {/* Meta row */}
          <View style={styles.metaRow}>
            {user.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
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
              <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                Joined {user.joinDate}
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
          {isOwn && <ProfileCompletionBar percent={user.profileCompletion} />}
        </View>

        {/* Photo Viewers */}
        <PhotoViewer
          visible={avatarViewerVisible}
          uri={user.avatarUrl}
          fallbackColor={user.avatarColor}
          initials={getInitials(user.displayName)}
          onClose={() => setAvatarViewerVisible(false)}
        />
        <PhotoViewer
          visible={coverViewerVisible}
          uri={user.coverUrl}
          fallbackColor={user.coverColor}
          onClose={() => setCoverViewerVisible(false)}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  cover: {
    height: COVER_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  coverViewHint: {
    position: "absolute",
    top: 10,
    left: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 5,
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
    borderWidth: 4,
    borderColor: "#fff",
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
  },
  initials: {
    color: "#fff",
    fontSize: 32,
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
  avatarViewHint: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 3,
  },
  ownActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 4,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  editBtnLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  info: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  displayName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  username: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  bio: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  requestBanner: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  requestText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  requestActions: {
    flexDirection: "row",
  },
  friendRow: {
    marginTop: 16,
    flexDirection: "row",
  },
  completionContainer: {
    marginTop: 16,
    gap: 8,
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completionLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  completionPct: {
    fontSize: 13,
    fontFamily: "Inter_800ExtraBold",
  },
  completionTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
  },
  completionFill: {
    height: "100%",
    borderRadius: 4,
  },
  // Photo Viewer
  photoViewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoViewerClose: {
    position: "absolute",
    top: 52,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  photoViewerImage: {
    width: "100%",
    height: "80%",
  },
  photoViewerFallback: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  photoViewerInitials: {
    color: "#fff",
    fontSize: 72,
    fontFamily: "Inter_700Bold",
  },
});
