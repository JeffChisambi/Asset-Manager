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
  hasShop?: boolean;
}

export const ProfileTabs = memo(
  ({ activeTab, onTabChange, hasShop }: ProfileTabsProps) => {
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
            const displayLabel = (hasShop && tab.key === "collection") ? "Shop" : tab.label;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => onTabChange(tab.key)}
                activeOpacity={0.7}
                style={[
                  styles.tabBtn,
                  isActive && [
                    styles.activeTabBtn,
                    { backgroundColor: colors.primary, borderColor: colors.primary },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? "#FFFFFF" : colors.mutedForeground,
                      fontFamily: isActive
                        ? "Inter_700Bold"
                        : "Inter_500Medium",
                    },
                  ]}
                >
                  {displayLabel}
                </Text>
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
    paddingVertical: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  activeTabBtn: {
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  tabLabel: {
    fontSize: 14,
  },
});
