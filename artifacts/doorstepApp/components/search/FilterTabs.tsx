import React from "react";
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
  { key: "all",          label: "All"           },
  { key: "product",      label: "Products"      },
  { key: "store",        label: "Stores"        },
  { key: "professional", label: "Professionals" },
  { key: "service",      label: "Services"      },
];

export function FilterTabs({ activeFilter, onFilterChange, counts }: Props) {
  const colors = useColors();

  const tabs: Tab[] = TABS.map((t) => ({ ...t, count: counts[t.key] ?? 0 })).filter(
    (t) => t.key === "all" || t.count > 0
  );

  return (
    <ScrollView
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
                backgroundColor: isActive ? colors.primary : colors.card,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: isActive ? "#FFFFFF" : colors.foreground },
              ]}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isActive ? "rgba(255,255,255,0.25)" : colors.muted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: isActive ? "#FFFFFF" : colors.mutedForeground },
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
