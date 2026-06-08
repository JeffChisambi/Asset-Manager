import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, Pressable, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

type AddTabButtonProps = {
  onPress?: React.ComponentProps<typeof Pressable>["onPress"];
};

function AddTabButton({ onPress }: AddTabButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.addBtn, { backgroundColor: colors.foreground }]}
    >
      <Ionicons name="cart" size={24} color={colors.background} />
    </Pressable>
  );
}

function NativeTabLayout() {
  const colors = useColors();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} selectedColor={colors.primary} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: "storefront", selected: "storefront.fill" }} selectedColor={colors.primary} />
        <Label>Marketplace</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="add">
        <Icon sf={{ default: "cart", selected: "cart.fill" }} selectedColor={colors.primary} />
        <Label>Cart</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} selectedColor={colors.primary} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: "bubble.left", selected: "bubble.left.fill" }} selectedColor={colors.primary} />
        <Label>Chat</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0.5,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 70,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={24} color={color} />
            ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="storefront" tintColor={color} size={24} />
            ) : (
              <MaterialCommunityIcons name="storefront-outline" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <AddTabButton onPress={props.onPress} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bubble.left" tintColor={color} size={24} />
            ) : (
              <Ionicons name="chatbubble-outline" size={23} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    elevation: 4,
    boxShadow: "0px 2px 6px rgba(0,0,0,0.18)",
  },
});
