import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { memo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Audio } from "expo-av";
import { Post } from "@/types/profile";
import { useColors } from "@/hooks/useColors";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

interface ActionButtonProps {
  icon: string;
  count?: number;
  active?: boolean;
  activeColor?: string;
  onPress: () => void;
}

const ActionButton = memo(
  ({ icon, count, active, activeColor, onPress }: ActionButtonProps) => {
    const colors = useColors();
    const scale = useSharedValue(1);
    const color = active ? activeColor ?? colors.primary : colors.mutedForeground;

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => (scale.value = withSpring(0.82, { damping: 8 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 8 }))}
        style={styles.actionBtn}
      >
        <Animated.View style={[styles.actionInner, animStyle]}>
          <Ionicons name={icon as any} size={19} color={color} />
          {count !== undefined && (
            <Text style={[styles.actionCount, { color }]}>
              {formatCount(count)}
            </Text>
          )}
        </Animated.View>
      </Pressable>
    );
  }
);

interface PostOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
}

const PostOptionsMenu = memo(({ visible, onClose, onDelete }: PostOptionsMenuProps) => {
  const colors = useColors();
  if (!visible) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.optionsBackdrop} onPress={onClose}>
        <View style={[styles.optionsSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.optionsTitle, { color: colors.mutedForeground }]}>Post Options</Text>
          <TouchableOpacity
            style={[styles.optionsRow, { borderTopColor: colors.border }]}
            onPress={() => {
              onClose();
              Alert.alert(
                "Delete Post",
                "Are you sure you want to permanently delete this post?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: onDelete },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.optionsDeleteText}>Delete Post</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionsRow, { borderTopColor: colors.border }]}
            onPress={onClose}
          >
            <Ionicons name="close-outline" size={18} color={colors.mutedForeground} />
            <Text style={[styles.optionsCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
});

interface ProfilePostCardProps {
  post: Post;
  isOwn?: boolean;
  onDelete?: () => void;
}

export const ProfilePostCard = memo(({ post, isOwn, onDelete }: ProfilePostCardProps) => {
  const colors = useColors();
  const [liked, setLiked] = useState(post.isLiked);
  const [saved, setSaved] = useState(post.isSaved);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [optionsVisible, setOptionsVisible] = useState(false);

  // Audio Playback State
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);

  // Parse type-prefixed media URLs: "image::url", "music::url", "voice::url"
  // Falls back to legacy heuristic detection for backwards compatibility.
  const parseMediaUrls = (urls?: string[]) => {
    if (!urls?.length) return { imageUrl: undefined, audioUrl: undefined, voiceUrl: undefined };
    let imageUrl: string | undefined;
    let audioUrl: string | undefined;
    let voiceUrl: string | undefined;

    for (const raw of urls) {
      if (raw.startsWith('image::')) {
        imageUrl = raw.slice('image::'.length);
      } else if (raw.startsWith('music::')) {
        audioUrl = raw.slice('music::'.length);
      } else if (raw.startsWith('voice::')) {
        voiceUrl = raw.slice('voice::'.length);
      } else {
        // Legacy fallback for posts created before the prefix scheme
        const lower = raw.toLowerCase();
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) {
          imageUrl = imageUrl ?? raw;
        } else if (lower.includes('music') || lower.endsWith('.mp3')) {
          audioUrl = audioUrl ?? raw;
        } else if (lower.includes('voice') || lower.endsWith('.m4a') || lower.endsWith('.aac')) {
          voiceUrl = voiceUrl ?? raw;
        } else {
          // Unknown — treat as image if no image found yet
          imageUrl = imageUrl ?? raw;
        }
      }
    }
    return { imageUrl, audioUrl, voiceUrl };
  };

  const { imageUrl, audioUrl, voiceUrl } = parseMediaUrls(post.mediaUrls);

  const playPauseAudio = async (url: string) => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true }
        );
        
        newSound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(Math.min(status.durationMillis || 1, 60000));
            
            if (status.positionMillis >= 60000) {
              await newSound.stopAsync();
              setIsPlaying(false);
              setSound(null);
            } else if (status.didJustFinish) {
              setIsPlaying(false);
              setSound(null);
            }
          }
        });
        
        setSound(newSound);
        setIsPlaying(true);
      } catch (err) {
        console.warn("Playback error", err);
        Alert.alert("Playback Error", "Could not play audio.");
      }
    }
  };

  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    setSaved((s) => !s);
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Header row — timestamp + options button for own posts */}
      <View style={styles.cardHeader}>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {post.createdAt}
        </Text>
        {isOwn && (
          <TouchableOpacity
            style={[styles.moreBtn, { backgroundColor: colors.muted }]}
            onPress={() => setOptionsVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="more-horizontal" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.content, { color: colors.foreground }]}>
        {post.content}
      </Text>

      {/* Attached image preview with optional music track */}
      {imageUrl && (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
          {audioUrl && (
            <TouchableOpacity
              onPress={() => playPauseAudio(audioUrl)}
              style={[styles.musicBadgeOverlay, { backgroundColor: "rgba(0, 0, 0, 0.6)" }]}
            >
              <Ionicons name={isPlaying && sound ? "pause" : "musical-notes"} size={14} color="#fff" />
              <Text style={styles.musicOverlayText}>
                {isPlaying ? "Playing Music" : "Attached Track"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Standalone music preview when no image is attached */}
      {!imageUrl && audioUrl && (
        <View style={[styles.audioCard, { backgroundColor: colors.border + "22", borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => playPauseAudio(audioUrl)} style={[styles.playBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name={isPlaying && sound ? "pause" : "musical-notes"} size={16} color="#fff" />
          </TouchableOpacity>
          <View style={styles.audioDetails}>
            <Text style={[styles.audioLabel, { color: colors.foreground }]}>Attached Audio Track</Text>
            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
              <View style={[styles.progressBarFill, { width: `${(position / duration) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
        </View>
      )}

      {/* Attached Voice Note */}
      {voiceUrl && (
        <View style={[styles.audioCard, { backgroundColor: colors.border + "22", borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => playPauseAudio(voiceUrl)} style={[styles.playBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name={isPlaying && sound ? "pause" : "mic"} size={16} color="#fff" />
          </TouchableOpacity>
          <View style={styles.audioDetails}>
            <Text style={[styles.audioLabel, { color: colors.foreground }]}>Voice Note</Text>
            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
              <View style={[styles.progressBarFill, { width: `${(position / duration) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
        </View>
      )}

      {post.productTag && (
        <View
          style={[
            styles.productTag,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
          <Text style={[styles.productTagText, { color: colors.primary }]}>
            {post.productTag.brand} · {post.productTag.name} ·{" "}
            <Text style={styles.productTagPrice}>
              ${post.productTag.price.toFixed(2)}
            </Text>
          </Text>
        </View>
      )}

      {(post.tags?.length ?? 0) > 0 && (
        <View style={styles.tags}>
          {post.tags!.map((tag) => (
            <Text
              key={tag}
              style={[styles.tag, { color: colors.primary }]}
            >
              #{tag}
            </Text>
          ))}
        </View>
      )}

      <View
        style={[styles.separator, { backgroundColor: colors.border }]}
      />

      <View style={styles.actions}>
        <ActionButton
          icon={liked ? "heart" : "heart-outline"}
          count={likeCount}
          active={liked}
          activeColor="#EF4444"
          onPress={handleLike}
        />
        <ActionButton
          icon="chatbubble-outline"
          count={post.comments}
          onPress={() => {}}
        />
        <ActionButton
          icon="arrow-redo-outline"
          count={post.shares}
          onPress={() => {}}
        />
        <View style={styles.spacer} />
        <ActionButton
          icon={saved ? "bookmark" : "bookmark-outline"}
          active={saved}
          onPress={handleSave}
        />
      </View>

      <PostOptionsMenu
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onDelete={() => onDelete?.()}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  moreBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 12,
  },
  productTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  productTagText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  productTagPrice: {
    fontFamily: "Inter_800ExtraBold",
  },
  mediaImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  tag: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  separator: {
    height: 1,
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  actionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  spacer: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  // Options menu
  optionsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  optionsSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingBottom: 32,
    overflow: "hidden",
  },
  optionsTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    paddingVertical: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  optionsDeleteText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#EF4444",
  },
  optionsCancelText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  imageWrapper: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginBottom: 12,
  },
  musicBadgeOverlay: {
    position: "absolute",
    bottom: 8,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  musicOverlayText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  audioCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  audioDetails: {
    flex: 1,
    gap: 6,
  },
  audioLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});
