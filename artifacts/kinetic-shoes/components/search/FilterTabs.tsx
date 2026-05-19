import React, { useRef } from "react";
import {
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { EntityType } from "@/data/searchData";
import { useColors } from "@/hooks/useColors";

interface Tab {
  key: EntityType | "all";
  label: string;
  count: number;
}

interface Props {
  activeFilter: EntityType | "all";
  onFilterChange: (filter: EntityType | "all") => void;
  counts: Record<EntityType | "all", number>;
}

const TABS: Array<{ key: EntityType | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "product", label: "Products" },
  { key: "store", label: "Stores" },
  { key: "professional", label: "Professionals" },
  { key: "service", label: "Services" },
];

export function FilterTabs({ activeFilter, onFilterChange, counts }: Props) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);

  const tabs: Tab[] = TABS.map((t) => ({ ...t, count: counts[t.key] ?? 0 })).filter(
    (t) => t.key === "all" || t.count > 0
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              onFilterChange(tab.key);
            }}
            style={[
              styles.tab,
              {
                backgroundColor: isActive ? colors.primary : colors.muted,
                borderColor: isActive ? colors.primary : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: isActive ? colors.primaryForeground : colors.mutedForeground,
                  fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.25)"
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: isActive
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {tab.count > 99 ? "99+" : tab.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
