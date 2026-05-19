import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ChatProvider } from "@/context/ChatContext";
import { CartProvider } from "@/context/CartContext";
import { OrderProvider } from "@/context/OrderContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SearchProvider } from "@/context/SearchContext";
import { LogBox } from "react-native";

LogBox.ignoreLogs(["[expo-av]: Expo AV has been deprecated"]);

try {
  SplashScreen.preventAutoHideAsync();
} catch {}

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const val = await AsyncStorage.getItem("hasLoggedIn");
      const isAuth = val === "true";
      const inAuthGroup = segments[0] === "login" || segments[0] === "signup";
      
      if (!isAuth && !inAuthGroup) {
        router.replace("/login");
      } else if (isAuth && inAuthGroup) {
        router.replace("/(tabs)");
      }
    };
    checkAuth();
  }, [segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="signup" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile/[userId]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="chat/new-group"
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="call/voice"
        options={{
          headerShown: false,
          animation: "slide_from_bottom",
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="call/video"
        options={{
          headerShown: false,
          animation: "slide_from_bottom",
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      </Stack>
    </AuthGuard>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [fontTimedOut, setFontTimedOut] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFontTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("hasLoggedIn").then((val) => {
      setIsAuthenticated(val === "true");
      setAuthChecked(true);
    });
  }, []);

  const ready = fontsLoaded || !!fontError || fontTimedOut;

  useEffect(() => {
    if (ready && authChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, authChecked]);

  if (!ready || !authChecked) return null;

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <SearchProvider>
                  <ChatProvider>
                    <CartProvider>
                      <OrderProvider>
                        <RootLayoutNav />
                      </OrderProvider>
                    </CartProvider>
                  </ChatProvider>
                </SearchProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
