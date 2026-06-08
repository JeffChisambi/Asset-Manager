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
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";
import { ProfileService } from "@/services/profile/profile.service";
import { fetchWithTimeout, getApiBase } from "@/lib/api";

const AVATAR_COLORS = [
  "#13B734",
  "#FF6B6B",
  "#4ECDC4",
  "#FFD93D",
  "#A29BFE",
  "#FD79A8",
  "#00B894",
  "#E17055",
];

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

const doorstepLogo = require("@/assets/logo and icon/doorsteplogo.png");

export default function SignupScreen() {
  const colors = useColors();
  const router = useRouter();
  const { setCurrentUser } = useChat();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const validateEmail = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  const validatePassword = (text: string) => {
    if (text.length < 8) return "Password must be at least 8 characters.";
    if (!/(?=.*[a-z])/.test(text)) return "Must contain a lowercase letter.";
    if (!/(?=.*[A-Z])/.test(text)) return "Must contain an uppercase letter.";
    if (!/(?=.*\d)/.test(text)) return "Must contain a number.";
    if (!/(?=.*[\W_])/.test(text)) return "Must contain a special character.";
    return "";
  };

  const handleSignup = async () => {
    setEmailError("");
    setPasswordError("");
    setGeneralError("");

    if (!fullName || !email || !password) {
      setGeneralError("Please fill in all fields.");
      return;
    }

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);

    if (eErr || pErr) {
      if (eErr) setEmailError(eErr);
      if (pErr) setPasswordError(pErr);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);

    const avatarColor = randomColor();
    const dn = fullName.trim();
    const rawUsername = dn.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "user";

    try {
      const base = getApiBase();
      if (!base) throw new Error("API server not configured");

      const resp = await fetchWithTimeout(`${base}/api/chat/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          displayName: dn,
          username: `${rawUsername}_${Math.floor(Math.random() * 9000 + 1000)}`,
          avatarColor,
        }),
      });

      const text = await resp.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        result = { error: `Server returned an invalid response (${resp.status}). Make sure the API server is running.` };
      }

      if (!resp.ok || !result.user || !result.token) {
        const msg = result?.error ?? "Registration failed. Please try again.";
        if (msg.toLowerCase().includes("email") && msg.toLowerCase().includes("exist")) {
          setGeneralError("An account with this email already exists. Please sign in.");
        } else {
          setGeneralError(msg);
        }
        return;
      }

      // Registration successful
      const { token, user } = result;

      await AsyncStorage.setItem("chatAuthToken", token).catch(() => {});
      await AsyncStorage.setItem("hasLoggedIn", "true").catch(() => {});

      setCurrentUser(
        {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          bio: user.bio ?? "",
          isBot: false,
        },
        token,
      );

      // Also save profile locally for offline fallback
      try {
        await ProfileService.createInitialProfile(user.id, {
          username: user.username,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          bio: "Sneaker enthusiast",
          location: "",
          website: "",
          title: "New Member",
          shoeSize: "",
          favoriteBrand: "",
        });
      } catch {}

      router.replace("/(tabs)");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setGeneralError("Sign up timed out. Make sure the API server is running.");
      } else if (err?.message?.includes("Network") || err?.message?.includes("fetch") || err?.message?.includes("API server")) {
        setGeneralError("Cannot connect to server. Please check your connection.");
      } else {
        setGeneralError(err?.message ?? "An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Join Doorstep today.
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Full Name
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.mutedForeground}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.mutedForeground}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Email
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.card,
                    borderColor: emailError
                      ? colors.destructive
                      : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={
                    emailError ? colors.destructive : colors.mutedForeground
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setEmailError("");
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {!!emailError && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  {emailError}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Password
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.card,
                    borderColor: passwordError
                      ? colors.destructive
                      : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={
                    passwordError ? colors.destructive : colors.mutedForeground
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Create a password"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setPasswordError("");
                  }}
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
              {!!passwordError && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  {passwordError}
                </Text>
              )}
            </View>

            {!!generalError && (
              <Text
                style={[
                  styles.errorText,
                  {
                    color: colors.destructive,
                    textAlign: "center",
                    marginTop: 8,
                  },
                ]}
              >
                {generalError}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.signupButton,
                { backgroundColor: colors.primary },
                (!fullName || !email || !password || isLoading) && { opacity: 0.7 },
              ]}
              onPress={handleSignup}
              disabled={!fullName || !email || !password || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={[
                    styles.signupButtonText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Sign up
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text
              style={[styles.footerText, { color: colors.mutedForeground }]}
            >
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={[styles.loginText, { color: colors.primary }]}>
                Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  eyeIcon: {
    padding: 4,
  },
  signupButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  signupButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 48,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  loginText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
});
