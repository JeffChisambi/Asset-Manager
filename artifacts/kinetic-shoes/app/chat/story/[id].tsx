import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserAvatar } from "@/components/chat/UserAvatar";
import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewerScreen() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getActiveStories, getUser, markStoryAsViewed, currentUser } = useChat();

  const user = getUser(userId ?? "");
  const allActiveStories = getActiveStories();
  const userStories = allActiveStories[userId ?? ""] || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Find first unread story if any
  useEffect(() => {
    if (userStories.length > 0 && currentUser) {
      const firstUnread = userStories.findIndex(s => !s.viewers.includes(currentUser.id));
      if (firstUnread !== -1) {
        setCurrentIndex(firstUnread);
      }
    }
  }, []);

  const currentStory = userStories[currentIndex];

  useEffect(() => {
    if (!currentStory) return;

    markStoryAsViewed(currentStory.id);
    
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => progressAnim.stopAnimation();
  }, [currentIndex, currentStory]);

  const handleNext = () => {
    if (currentIndex < userStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      router.back();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      // If at start, restart animation
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: STORY_DURATION,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) handleNext();
      });
    }
  };

  const handlePress = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < width / 3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  if (!user || userStories.length === 0 || !currentStory) {
    return (
      <View style={[styles.root, { backgroundColor: "#000", justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#FFF" }}>Story no longer available</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20, padding: 10, backgroundColor: "#333", borderRadius: 8 }}>
          <Text style={{ color: "#FFF" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 20 : insets.top;

  const renderContent = () => {
    if (currentStory.type === "image" && currentStory.mediaUri) {
      return <Image source={{ uri: currentStory.mediaUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
    }
    // Default to text if text or unsupported type
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: currentStory.backgroundColor || "#4A80F0", justifyContent: "center", alignItems: "center", padding: 24 }]}>
        <Text style={styles.storyText}>{currentStory.text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {renderContent()}

      {/* Progress Bars */}
      <View style={[styles.progressContainer, { top: topPad + 10 }]}>
        {userStories.map((s, idx) => {
          let flexBase = 0;
          if (idx < currentIndex) flexBase = 1;
          
          return (
            <View key={s.id} style={styles.progressBarBg}>
              {idx === currentIndex ? (
                <Animated.View 
                  style={[
                    styles.progressBarActive, 
                    { 
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"]
                      }) 
                    }
                  ]} 
                />
              ) : (
                <View style={[styles.progressBarActive, { width: idx < currentIndex ? "100%" : "0%" }]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Header */}
      <View style={[styles.header, { top: topPad + 24 }]}>
        <View style={styles.userInfo}>
          <UserAvatar displayName={user.displayName} avatarColor={user.avatarColor} size={36} />
          <View>
            <Text style={styles.userName}>{user.displayName}</Text>
            <Text style={styles.timeAgo}>
              {Math.floor((Date.now() - currentStory.createdAt) / 3600000)}h ago
            </Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </Pressable>
      </View>

      {/* Tap Zones */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handlePress} />
      
      {/* Viewers (if it's my story) */}
      {userId === currentUser?.id && (
        <View style={[styles.viewersContainer, { bottom: Platform.OS === "web" ? 30 : insets.bottom + 20 }]}>
          <Ionicons name="eye-outline" size={20} color="#FFF" />
          <Text style={styles.viewersText}>{currentStory.viewers.length}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  storyText: {
    color: "#FFF",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  progressContainer: {
    position: "absolute",
    left: 10,
    right: 10,
    flexDirection: "row",
    gap: 4,
    zIndex: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarActive: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  header: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userName: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeAgo: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewersContainer: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    zIndex: 10,
  },
  viewersText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  }
});
