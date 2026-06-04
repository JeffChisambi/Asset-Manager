import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";
import { supabase } from "@/lib/supabase";
import { getApiBase } from "@/lib/api";

const doorstepLogo = require("@/assets/logo and icon/doorsteplogo.png");

const AVATAR_COLORS = [
  "#13B734", "#FF6B6B", "#4ECDC4", "#FFD93D",
  "#A29BFE", "#FD79A8", "#00B894", "#E17055",
];
function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { setCurrentUser, currentUser } = useChat();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const handleLogin = async () => {
    setGeneralError("");

    if (!email || !password) {
      setGeneralError("Please enter your email and password.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      if (
        error.message.includes("URL") ||
        error.message.includes("fetch") ||
        error.message.includes("Network request failed") ||
        error.message.includes("AuthRetryableFetchError")
      ) {
        setGeneralError(
          "Unable to reach Supabase. Please check your internet connection.",
        );
      } else {
        setGeneralError("Invalid login credentials.");
      }
      return;
    }

    const token = data.session?.access_token ?? "";
    const userId = data.user?.id ?? "me_" + Date.now();

    // Derive display info from email for new profiles
    const dn = (data.user?.user_metadata?.full_name as string) || email.split("@")[0];
    const un =
      dn.toLowerCase().replace(/[^a-z0-9_]/g, "") +
      Math.floor(Math.random() * 1000);
    const avatarColor = randomColor();

    // Sync chat profile with API server (non-blocking; creates if missing)
    if (token) {
      const base = getApiBase();
      if (base) {
        fetch(`${base}/api/chat/profile/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            username: un,
            displayName: dn || "User",
            avatarColor,
            bio: "",
          }),
        }).catch(() => {});
      }
    }

    // Set user with token so ChatContext loads fresh data
    if (!currentUser) {
      setCurrentUser(
        {
          id: userId,
          username: un,
          displayName: dn || "User",
          avatarColor,
          bio: "",
          isBot: false,
        },
        token,
      );
    } else if (token) {
      // Already has user; just update the token
      await AsyncStorage.setItem("chatAuthToken", token);
    }

    await AsyncStorage.setItem("hasLoggedIn", "true");
    setIsLoading(false);
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.header}>
          <Image
            source={doorstepLogo}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Doorstep
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Welcome back. Please enter your details.
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Email
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.mutedForeground}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Enter your email"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Password
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.mutedForeground}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>

          {!!generalError && (
            <Text
              style={[
                styles.errorText,
                { color: colors.destructive, textAlign: "center", marginTop: 8 },
              ]}
            >
              {generalError}
            </Text>
          )}

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: colors.foreground },
              (!email || !password) && { opacity: 0.7 },
            ]}
            onPress={handleLogin}
            disabled={!email || !password || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.loginButtonText, { color: colors.background }]}>
                Sign in
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={[styles.signupText, { color: colors.primary }]}>
              Sign up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 48 },
  logo: { width: 80, height: 80, marginBottom: 16, borderRadius: 20 },
  title: { fontSize: 28, fontFamily: "Inter_800ExtraBold", marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  form: { gap: 20 },
  inputContainer: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeIcon: { padding: 4 },
  forgotPassword: { alignSelf: "flex-end" },
  forgotPasswordText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  loginButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  loginButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 48,
  },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  signupText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 4 },
});
