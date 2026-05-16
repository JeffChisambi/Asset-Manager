import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { memo, useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileTabs } from "./ProfileTabs";
import { ProfilePostCard } from "./ProfilePostCard";
import { useProfile } from "@/hooks/profile/useProfile";
import { CURRENT_USER_ID } from "@/mock/users";
import { Post, ProfileTab, User } from "@/types/profile";
import { useColors } from "@/hooks/useColors";

// ─── Empty state ─────────────────────────────────────────────────────────────

interface EmptyTabProps {
  icon: string;
  title: string;
  subtitle: string;
}

const EmptyTab = memo(({ icon, title, subtitle }: EmptyTabProps) => {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon as any} size={48} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
        {subtitle}
      </Text>
    </View>
  );
});

// ─── About tab ───────────────────────────────────────────────────────────────

interface AboutTabProps {
  user: User;
}

const AboutTab = memo(({ user }: AboutTabProps) => {
  const colors = useColors();

  const rows: { icon: string; label: string; value: string }[] = [
    { icon: "location-outline", label: "Location", value: user.location || "—" },
    { icon: "calendar-outline", label: "Joined", value: user.joinDate },
    { icon: "link-outline", label: "Website", value: user.website || "—" },
  ];

  const shoeRows: { icon: string; label: string; value: string }[] = [
    { icon: "resize-outline", label: "Shoe size", value: user.shoeSize },
    { icon: "star-outline", label: "Favourite brand", value: user.favoriteBrand },
    { icon: "ribbon-outline", label: "Title", value: user.title },
  ];

  return (
    <View style={styles.aboutContainer}>
      <View
        style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.aboutSection, { color: colors.foreground }]}>
          Bio
        </Text>
        <Text style={[styles.aboutBio, { color: colors.foreground }]}>
          {user.bio || "No bio yet."}
        </Text>
      </View>

      <View
        style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.aboutSection, { color: colors.foreground }]}>
          Info
        </Text>
        {rows.map((r) => (
          <View key={r.label} style={styles.aboutRow}>
            <Ionicons
              name={r.icon as any}
              size={16}
              color={colors.mutedForeground}
            />
            <Text style={[styles.aboutRowLabel, { color: colors.mutedForeground }]}>
              {r.label}
            </Text>
            <Text style={[styles.aboutRowValue, { color: colors.foreground }]}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.aboutSection, { color: colors.foreground }]}>
          Sneaker Profile
        </Text>
        {shoeRows.map((r) => (
          <View key={r.label} style={styles.aboutRow}>
            <Ionicons
              name={r.icon as any}
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.aboutRowLabel, { color: colors.mutedForeground }]}>
              {r.label}
            </Text>
            <Text style={[styles.aboutRowValue, { color: colors.foreground }]}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonBlock = memo(
  ({ width, height, style }: { width: number | string; height: number; style?: any }) => {
    const colors = useColors();
    return (
      <View
        style={[
          { width: width as any, height, borderRadius: 8, backgroundColor: colors.muted },
          style,
        ]}
      />
    );
  }
);

const ProfileSkeleton = memo(() => {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.background }}>
      <View style={[styles.skeletonCover, { backgroundColor: colors.muted }]} />
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <SkeletonBlock width={80} height={80} style={{ borderRadius: 40, marginTop: -40 }} />
        <View style={{ height: 12 }} />
        <SkeletonBlock width={160} height={20} />
        <View style={{ height: 8 }} />
        <SkeletonBlock width={100} height={14} />
        <View style={{ height: 12 }} />
        <SkeletonBlock width="90%" height={14} />
        <View style={{ height: 6 }} />
        <SkeletonBlock width="70%" height={14} />
      </View>
    </View>
  );
});

// ─── Main ProfileScreen ───────────────────────────────────────────────────────

interface ProfileScreenProps {
  userId: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function ProfileScreen({ userId, showBackButton, onBack }: ProfileScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { user, posts, isLoading, error, refresh } = useProfile(userId);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  const isOwn = userId === CURRENT_USER_ID;

  const renderPost = useCallback(
    ({ item }: { item: Post }) => <ProfilePostCard post={item} />,
    []
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        {showBackButton && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <ProfileSkeleton />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        {showBackButton && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          {error ?? "User not found"}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={refresh}
        >
          <Text style={styles.retryBtnLabel}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Tab content (non-posts)
  const renderTabContent = () => {
    switch (activeTab) {
      case "posts":
        return null; // handled by FlatList
      case "collection":
        return (
          <EmptyTab
            icon="cube-outline"
            title="No Collection Yet"
            subtitle="Shoes you own will appear here"
          />
        );
      case "wishlist":
        return (
          <EmptyTab
            icon="heart-outline"
            title="Wishlist is Empty"
            subtitle="Save shoes you want to buy"
          />
        );
      case "reviews":
        return (
          <EmptyTab
            icon="star-outline"
            title="No Reviews Yet"
            subtitle="Reviews for purchased shoes appear here"
          />
        );
      case "about":
        return <AboutTab user={user} />;
      default:
        return null;
    }
  };

  const headerContent = (
    <>
      {showBackButton && (
        <View style={[styles.floatingBack, { top: topPad + 8 }]}>
          <TouchableOpacity
            style={[styles.backCircle, { backgroundColor: "rgba(0,0,0,0.45)" }]}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      {!showBackButton && (
        <View style={{ height: topPad }} />
      )}
      <ProfileHeader
        user={user}
        isOwn={isOwn}
      />
      <ProfileStats
        posts={user.postsCount}
        followers={user.followersCount}
        following={user.followingCount}
        friends={user.friendsCount}
      />
      <View style={{ height: 14 }} />
    </>
  );

  if (activeTab === "posts") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={keyExtractor}
          ListHeaderComponent={
            <>
              {headerContent}
              <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
              <View style={{ height: 14 }} />
            </>
          }
          ListEmptyComponent={
            <EmptyTab
              icon="newspaper-outline"
              title="No Posts Yet"
              subtitle="Posts will appear here"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          stickyHeaderIndices={[]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        stickyHeaderIndices={[1]}
      >
        <View>{headerContent}</View>
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <View>{renderTabContent()}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  backBtn: {
    padding: 12,
  },
  floatingBack: {
    position: "absolute",
    left: 14,
    zIndex: 10,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonCover: {
    height: 160,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 100,
    marginTop: 8,
  },
  retryBtnLabel: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  aboutContainer: {
    padding: 16,
    gap: 12,
  },
  aboutCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  aboutSection: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  aboutBio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aboutRowLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    width: 110,
  },
  aboutRowValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
});
