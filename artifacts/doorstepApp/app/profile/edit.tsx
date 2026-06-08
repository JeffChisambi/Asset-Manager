import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";
import { ProfileService } from "@/services/profile/profile.service";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Avatar colour palette ───────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#13B734", "#FF6B6B", "#4ECDC4", "#FFD93D",
  "#A29BFE", "#FD79A8", "#00B894", "#E17055",
  "#6C5CE7", "#FDCB6E", "#00CEC9", "#E84393",
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";
}

// ─── Reusable InputField ──────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
}: InputFieldProps) {
  const colors = useColors();
  return (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
        {maxLength && (
          <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.input,
            color: colors.foreground,
            borderColor: colors.border,
            height: multiline ? 100 : 48,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        maxLength={maxLength}
      />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, setCurrentUser } = useChat();
  const userId = currentUser?.id ?? "me";

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Text fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  // Photo fields
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState(colors.primary);

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const profile = await ProfileService.getUser(userId);
      if (profile && !cancelled) {
        setDisplayName(profile.displayName || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setLocation(profile.location || "");
        setWebsite(profile.website || "");
        setAvatarColor(profile.avatarColor || colors.primary);
        if (profile.avatarUrl) setAvatarUri(profile.avatarUrl);
        if (profile.coverUrl) setCoverUri(profile.coverUrl);
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, colors.primary]);

  // ── Image picker helpers ────────────────────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library in Settings to choose a photo.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  }, []);

  const pickAvatarPhoto = useCallback(async () => {
    const allowed = await requestPermission();
    if (!allowed) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  }, [requestPermission]);

  const pickCoverPhoto = useCallback(async () => {
    const allowed = await requestPermission();
    if (!allowed) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.85,
      base64: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setCoverUri(result.assets[0].uri);
    }
  }, [requestPermission]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!displayName.trim()) {
      Alert.alert("Name required", "Please enter your display name.");
      return;
    }
    setIsSaving(true);
    try {
      let finalAvatarUrl = avatarUri;

      // If it's a local file URI, we must upload it so it's publicly accessible to others
      if (avatarUri && avatarUri.startsWith("file://")) {
        const token = await AsyncStorage.getItem("chatAuthToken");
        if (token) {
          const { getApiBase } = require("@/lib/api");
          const formData = new FormData();
          const ext = avatarUri.split(".").pop() || "jpg";
          formData.append("file", {
            uri: Platform.OS === "android" ? avatarUri : avatarUri.replace("file://", ""),
            name: `avatar.${ext}`,
            type: `image/${ext === "png" ? "png" : "jpeg"}`,
          } as any);

          const base = getApiBase();
          const res = await fetch(`${base}/api/chat/upload-image`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.imageUrl) {
              finalAvatarUrl = data.imageUrl;
              setAvatarUri(finalAvatarUrl);
            }
          }
        }
      }

      await ProfileService.updateProfile(userId, {
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatarColor,
        avatarUrl: finalAvatarUrl ?? undefined,
        coverUrl: coverUri ?? undefined,
      });

      const token = await AsyncStorage.getItem("chatAuthToken");
      if (token) {
        const { chatApiCall } = require("@/lib/api");
        await chatApiCall("/api/chat/profile/sync", "POST", token, {
          displayName: displayName.trim(),
          username: username.trim(),
          avatarColor,
          avatarUrl: finalAvatarUrl ?? undefined,
        }).catch(() => {});
      }

      // Keep chat context display name + avatar in sync
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          displayName: displayName.trim(),
          username: username.trim(),
          avatarColor,
          avatarUrl: finalAvatarUrl ?? undefined,
        });
      }

      router.back();
    } catch (err) {
      Alert.alert("Save failed", "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [userId, displayName, username, bio, location, website, avatarColor, avatarUri, coverUri, currentUser, setCurrentUser, router]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Loading profile…
        </Text>
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header bar */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 20), borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Cover photo ─────────────────────────────────────────────────── */}
        <View style={styles.coverSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cover Photo</Text>
          <Pressable
            style={[styles.coverPicker, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={pickCoverPhoto}
          >
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Feather name="image" size={32} color={colors.mutedForeground} />
                <Text style={[styles.coverPlaceholderText, { color: colors.mutedForeground }]}>
                  Tap to add cover photo
                </Text>
              </View>
            )}
            {/* Edit overlay */}
            <View style={styles.coverEditOverlay}>
              <View style={[styles.photoOverlayBtn, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                <Feather name="camera" size={16} color="#fff" />
                <Text style={styles.photoOverlayText}>
                  {coverUri ? "Change Cover" : "Add Cover"}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* ── Profile photo ────────────────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarPressable} onPress={pickAvatarPhoto}>
            <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Text style={styles.initials}>{getInitials(displayName)}</Text>
              )}
            </View>
            {/* Camera badge */}
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
              <Feather name="camera" size={14} color="#fff" />
            </View>
          </Pressable>
          <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
            Tap photo to change
          </Text>
        </View>

        {/* ── Colour picker for avatar ────────────────────────────────────── */}
        <View style={styles.colorSection}>
          <Text style={[styles.colorLabel, { color: colors.mutedForeground }]}>
            Avatar colour (used as fallback)
          </Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  avatarColor === c && styles.colorDotActive,
                ]}
                onPress={() => setAvatarColor(c)}
              />
            ))}
          </View>
        </View>

        {/* ── Basic info ───────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Basic Info</Text>
          <View style={styles.formGap}>
            <InputField
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your full name"
              maxLength={60}
            />
            <InputField
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="@handle"
              maxLength={30}
            />
            <InputField
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself…"
              multiline
              maxLength={160}
            />
          </View>
        </View>

        {/* ── Details ──────────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Details</Text>
          <View style={styles.formGap}>
            <InputField
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="City, Country"
              maxLength={80}
            />
            <InputField
              label="Website"
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yoursite.com"
              maxLength={120}
            />
          </View>
        </View>

        <View style={{ height: insets.bottom + 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 8,
    minWidth: 56,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  content: {
    padding: 16,
    gap: 20,
  },

  // Cover
  coverSection: {
    gap: 10,
  },
  coverPicker: {
    height: 160,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverPlaceholder: {
    alignItems: "center",
    gap: 8,
  },
  coverPlaceholderText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  coverEditOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 12,
  },
  photoOverlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  photoOverlayText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    gap: 10,
  },
  avatarPressable: {
    position: "relative",
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#fff",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  initials: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 4,
  },
  avatarHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  // Colour picker
  colorSection: {
    gap: 10,
  },
  colorLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginLeft: 2,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: "#fff",
    transform: [{ scale: 1.15 }],
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // Cards
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  formGap: {
    gap: 16,
  },

  // Input
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginLeft: 4,
  },
  charCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 14 : 12,
    paddingBottom: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
