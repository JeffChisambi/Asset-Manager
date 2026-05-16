import React, { memo, useRef } from "react";
import {
  ScrollView,
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
import { ProfileTab } from "@/types/profile";
import { useColors } from "@/hooks/useColors";

const TABS: { key: ProfileTab; label: string }[] = [
  { key: "posts", label: "Posts" },
  { key: "collection", label: "Collection" },
  { key: "wishlist", label: "Wishlist" },
  { key: "reviews", label: "Reviews" },
  { key: "about", label: "About" },
];

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export const ProfileTabs = memo(
  ({ activeTab, onTabChange }: ProfileTabsProps) => {
    const colors = useColors();

    return (
      <View
        style={[
          styles.wrapper,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => onTabChange(tab.key)}
                activeOpacity={0.7}
                style={styles.tabBtn}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? colors.primary : colors.mutedForeground,
                      fontFamily: isActive
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {isActive && (
                  <View
                    style={[
                      styles.indicator,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 20,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 14,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
  },
});
