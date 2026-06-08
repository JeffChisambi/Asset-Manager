import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { memo, useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Pressable,
  TextInput,
  Image,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_W = (width - 48) / 2;
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProfileService } from "@/services/profile/profile.service";
import { StoreService } from "@/services/store/store.service";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileTabs } from "./ProfileTabs";
import { ProfilePostCard } from "./ProfilePostCard";
import { useProfile } from "@/hooks/profile/useProfile";
import { Post, ProfileTab, User, WishlistItem } from "@/types/profile";
import { Store, MerchantType } from "@/types/store";
import { useChat } from "@/context/ChatContext";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { useColors } from "@/hooks/useColors";
import { useStore } from "@/hooks/useStore";
import { DeliveryRegistrationForm } from "../delivery/DeliveryRegistrationForm";

// Delivery Partner Dashboard – shows mock performance stats
const DeliveryDashboard = () => {
  const colors = useColors();
  return (
    <View style={{ padding: 18, gap: 14 }}>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 20,
          fontFamily: "Inter_700Bold",
        }}
      >
        Delivery Partner Dashboard
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            Deliveries
          </Text>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 24,
              fontFamily: "Inter_800ExtraBold",
            }}
          >
            124
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            Acceptance Rate
          </Text>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 24,
              fontFamily: "Inter_800ExtraBold",
            }}
          >
            97%
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            Earnings
          </Text>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 24,
              fontFamily: "Inter_800ExtraBold",
            }}
          >
            $1,240
          </Text>
        </View>
      </View>
    </View>
  );
};

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
    {
      icon: "location-outline",
      label: "Location",
      value: user.location || "—",
    },
    { icon: "calendar-outline", label: "Joined", value: user.joinDate },
    { icon: "link-outline", label: "Website", value: user.website || "—" },
  ];

  return (
    <View style={styles.aboutContainer}>
      <View
        style={[
          styles.aboutCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.aboutSection, { color: colors.foreground }]}>
          Bio
        </Text>
        <Text style={[styles.aboutBio, { color: colors.foreground }]}>
          {user.bio || "No bio yet."}
        </Text>
      </View>

      <View
        style={[
          styles.aboutCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
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
            <Text
              style={[styles.aboutRowLabel, { color: colors.mutedForeground }]}
            >
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
  ({
    width,
    height,
    style,
  }: {
    width: number | string;
    height: number;
    style?: any;
  }) => {
    const colors = useColors();
    return (
      <View
        style={[
          {
            width: width as any,
            height,
            borderRadius: 8,
            backgroundColor: colors.muted,
          },
          style,
        ]}
      />
    );
  },
);

const ProfileSkeleton = memo(() => {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.background }}>
      <View style={[styles.skeletonCover, { backgroundColor: colors.muted }]} />
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <SkeletonBlock
          width={80}
          height={80}
          style={{ borderRadius: 40, marginTop: -40 }}
        />
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

interface ShopVendorSidebarProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  store: Store | null;
  onSuccess: () => void;
  onDeleteStore?: (storeId: string) => void;
}

function ShopVendorSidebar({
  visible,
  onClose,
  userId,
  store,
  onSuccess,
  onDeleteStore,
}: ShopVendorSidebarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Navigation tabs inside Sidebar
  const [step, setStep] = useState<"choose" | "builder" | "success">("choose");
  const [builderTab, setBuilderTab] = useState<
    "branding" | "inventory" | "preview" | "settings"
  >("branding");
  const [loading, setLoading] = useState(false);
  const [merchantType, setMerchantType] = useState<MerchantType>("basic_shop");

  // Link store fields
  const [linkMerchantId, setLinkMerchantId] = useState("");
  const [linkStoreId, setLinkStoreId] = useState("");
  const [linkError, setLinkError] = useState("");

  // Shop / Vendor Branding Fields
  const [storeName, setStoreName] = useState("");
  const [storeTagline, setStoreTagline] = useState("");
  const [storeEmoji, setStoreEmoji] = useState("🏪");
  const [storeAccent, setStoreAccent] = useState("#4A80F0");
  const [coverGradient, setCoverGradient] = useState<[string, string]>([
    "#4A00E0",
    "#8E2DE2",
  ]);
  const [coverImageUrl, setCoverImageUrl] = useState("");

  // Products Inventory Fields
  const [products, setProducts] = useState<any[]>([]);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Shoes");
  const [newProdImageUrl, setNewProdImageUrl] = useState("");

  // Product Editing state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  // Store active status
  const [isActive, setIsActive] = useState(true);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Constants
  const EMOJIS = ["🏪", "👟", "🍕", "💻", "🛋️", "💄", "🍎", "⚡"];
  const ACCENTS = ["#4A80F0", "#11998E", "#F7971E", "#7C3AED", "#FF6B6B"];
  const GRADIENTS: { name: string; colors: [string, string] }[] = [
    { name: "Neon Purple", colors: ["#4A00E0", "#8E2DE2"] },
    { name: "Ocean Breeze", colors: ["#00c6ff", "#0072ff"] },
    { name: "Sunset Gold", colors: ["#F7971E", "#FFD200"] },
    { name: "Emerald Teal", colors: ["#11998E", "#38EF7D"] },
    { name: "Cherry Blast", colors: ["#FF416C", "#FF4B2B"] },
  ];

  const PRODUCT_CATEGORIES = [
    { label: "Shoes", emoji: "👟" },
    { label: "Food", emoji: "🍔" },
    { label: "Fashion", emoji: "👗" },
    { label: "Electronics", emoji: "📱" },
    { label: "Furniture", emoji: "🛋️" },
    { label: "Beauty", emoji: "💄" },
  ];

  const handleAddProduct = () => {
    if (!newProdName.trim()) {
      Alert.alert("Required", "Please enter product name");
      return;
    }
    const priceNum = parseFloat(newProdPrice) || 29.99;

    if (editingProductId) {
      // Update existing
      setProducts(
        products.map((p) =>
          p.id === editingProductId
            ? {
                ...p,
                name: newProdName.trim(),
                price: priceNum,
                image_url: newProdImageUrl.trim() || null,
                category: newProdCategory,
              }
            : p,
        ),
      );
      setEditingProductId(null);
    } else {
      // Add new
      const newProd = {
        id: "temp-" + Date.now().toString(),
        name: newProdName.trim(),
        price: priceNum,
        brand: "My Brand",
        rating: 5.0,
        category: newProdCategory,
        image_url: newProdImageUrl.trim() || null,
      };
      setProducts([...products, newProd]);
    }

    setNewProdName("");
    setNewProdPrice("");
    setNewProdImageUrl("");
    setNewProdCategory("Shoes");
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setNewProdName("");
    setNewProdPrice("");
    setNewProdImageUrl("");
    setNewProdCategory("Shoes");
  };

  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteStore = () => {
    if (!store) return;
    const storeName = store.name;

    Alert.alert(
      "Delete Shop",
      `Are you sure you want to permanently delete "${storeName}"? This will remove all products and data. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              `You are about to permanently delete "${storeName}". This cannot be reversed.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Permanently",
                  style: "destructive",
                  onPress: async () => {
                    setDeleteLoading(true);
                    try {
                      await StoreService.deleteStore(store.id, userId);
                      onDeleteStore?.(store.id);
                      onClose();
                      onSuccess();
                    } catch (err: any) {
                      Alert.alert(
                        "Deletion Failed",
                        err.message ||
                          "Could not delete this shop. Please try again.",
                      );
                    } finally {
                      setDeleteLoading(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleDeactivateStore = () => {
    if (!store) return;
    const action = isActive ? "deactivate" : "reactivate";
    const actionLabel = isActive ? "Deactivate" : "Reactivate";
    const desc = isActive
      ? `Deactivating "${store.name}" will hide it from the Marketplace. Customers won't be able to find or browse it until you reactivate it.`
      : `Reactivating "${store.name}" will make it visible again in the Marketplace immediately.`;

    Alert.alert(`${actionLabel} Shop`, desc, [
      { text: "Cancel", style: "cancel" },
      {
        text: actionLabel,
        style: isActive ? "destructive" : "default",
        onPress: async () => {
          setDeactivateLoading(true);
          try {
            await StoreService.updateStore(store.id, {
              ...store,
              is_active: !isActive,
              owner_id: userId,
            });
            setIsActive((prev) => !prev);
            onSuccess();
          } catch (err: any) {
            Alert.alert(
              "Error",
              err.message || `Could not ${action} the shop. Try again.`,
            );
          } finally {
            setDeactivateLoading(false);
          }
        },
      },
    ]);
  };

  const handleLinkStore = async () => {
    if (!linkStoreId.trim() || !linkMerchantId.trim()) {
      setLinkError("Please enter both your Merchant ID and Store ID.");
      return;
    }
    setLinkError("");
    setLoading(true);
    try {
      const linked = await StoreService.linkStoreToProfile(
        linkStoreId.trim(),
        userId,
        linkMerchantId.trim()
      );
      if (!linked) {
        setLinkError("Could not link store. Please check your Merchant ID and Store ID.");
        return;
      }
      setStep("success");
      onSuccess();
    } catch (err: any) {
      setLinkError(err.message || "Failed to link store. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStore = async () => {
    if (!storeName.trim()) {
      Alert.alert("Required field", "Please enter a store name.");
      return;
    }
    setLoading(true);
    try {
      const title =
        merchantType === "basic_shop"
          ? "Basic Shop Owner"
          : "Independent Vendor";
      await ProfileService.updateProfile(userId, { title });

      const config = {
        owner_id: userId,
        name: storeName.trim(),
        tagline: storeTagline.trim() || "Your ultimate marketplace partner",
        emoji: storeEmoji,
        accent_color: storeAccent,
        cover_gradient_start: coverGradient[0],
        cover_gradient_end: coverGradient[1],
        cover_image_url: coverImageUrl.trim() || null,
        products: products,
        merchant_type: merchantType,
      };

      if (store) {
        await StoreService.updateStore(store.id, config as any);
      } else {
        await StoreService.createStore(config as any);
      }
      setStep("success");
      onSuccess();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.message || "Could not build store config. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const pickImage = async (onSelected: (uri: string) => void) => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need camera roll permissions to select images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelected(result.assets[0].uri);
      }
    } catch (e) {
      console.log("Image picker error:", e);
      Alert.alert("Error", "Could not pick image from device.");
    }
  };

  const handleClose = () => {
    setStep("choose");
    setBuilderTab("branding");
    onClose();
  };

  // Sidebar reanimated setup - cover the full screen
  const screenHeight = Dimensions.get("window").height;
  const animValue = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);

  const [sidebarVisible, setSidebarVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setSidebarVisible(true);
      if (store) {
        setMerchantType(store.merchant_type);
        setStoreName(store.name || "");
        setStoreTagline(store.tagline || "");
        setStoreEmoji(store.emoji || "🏪");
        setStoreAccent(store.accent_color || "#4A80F0");
        setCoverGradient([
          store.cover_gradient_start || "#4A00E0",
          store.cover_gradient_end || "#8E2DE2",
        ]);
        setCoverImageUrl(store.cover_image_url || "");
        setProducts(store.products || []);
        setIsActive(store.is_active !== false); // default true
        setStep("builder");
      } else {
        // Reset to default for new store creation
        setMerchantType("basic_shop");
        setStoreName("");
        setStoreTagline("");
        setStoreEmoji("🏪");
        setStoreAccent("#4A80F0");
        setCoverGradient(["#4A00E0", "#8E2DE2"]);
        setCoverImageUrl("");
        setProducts([]);
        setStep("choose");
      }
      setBuilderTab("branding");
      animValue.value = withTiming(0, { duration: 350 });
      backdropOpacity.value = withTiming(1, { duration: 350 });
    } else {
      animValue.value = withTiming(screenHeight, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 250 });
      const timer = setTimeout(() => {
        setSidebarVisible(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [visible, store]);

  const sidebarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animValue.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!sidebarVisible) return null;

  return (
    <Modal
      transparent
      visible={sidebarVisible}
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.sidebarBackdrop, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sidebar Sheet */}
      <Animated.View
        style={[
          styles.sidebarSheet,
          sidebarAnimatedStyle,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.sidebarHeader}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.sidebarSubtitle,
                { color: colors.mutedForeground },
              ]}
            >
              {store ? "Shop Manager" : "Store Builder"}
            </Text>
            <Text
              style={[styles.sidebarTitle, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {step === "choose"
                ? "Link Your Store"
                : step === "success"
                  ? "Success!"
                  : store
                    ? "Edit Store Properties"
                    : merchantType === "basic_shop"
                      ? "Basic Store"
                      : "Vendor Store"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.sidebarCloseBtn}
          >
            <Ionicons name="close" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {step === "choose" ? (
          <ScrollView
            contentContainerStyle={[styles.sidebarBody, { paddingBottom: 40 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Info card */}
            <View style={{
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary + "44",
              borderWidth: 1,
              borderRadius: 14,
              padding: 16,
              gap: 6,
              marginBottom: 4,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="storefront" size={20} color={colors.primary} />
                <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                  Link Your Merchant Store
                </Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 }}>
                Stores are managed via the Doorstep Merchant Dashboard. Enter your Merchant ID and Store ID below to connect your store to this profile.
              </Text>
            </View>

            <Text style={[styles.modalLabel, { color: colors.foreground, marginTop: 14 }]}>
              Merchant ID
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 6 }}>
              Your numeric merchant account ID (found in the dashboard under Account Settings)
            </Text>
            <TextInput
              style={[
                styles.formInput,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input },
              ]}
              placeholder="e.g. 1"
              placeholderTextColor={colors.mutedForeground}
              value={linkMerchantId}
              onChangeText={setLinkMerchantId}
              keyboardType="numeric"
              returnKeyType="next"
            />

            <Text style={[styles.modalLabel, { color: colors.foreground, marginTop: 14 }]}>
              Store ID
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 6 }}>
              Your store's numeric ID (found in the dashboard under Store Settings)
            </Text>
            <TextInput
              style={[
                styles.formInput,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input },
              ]}
              placeholder="e.g. 1"
              placeholderTextColor={colors.mutedForeground}
              value={linkStoreId}
              onChangeText={setLinkStoreId}
              keyboardType="numeric"
              returnKeyType="done"
            />

            {linkError ? (
              <View style={{ backgroundColor: "#EF444415", borderColor: "#EF4444", borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 }}>
                <Text style={{ color: "#EF4444", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  {linkError}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.sidebarSubmitBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
              onPress={handleLinkStore}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Link Store to Profile</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : step === "success" ? (
          <View style={styles.successWrapper}>
            <Ionicons name="checkmark-circle" size={72} color="#22C55E" />
            <Text
              style={[styles.successTitleText, { color: colors.foreground }]}
            >
              {store ? "Updated Successfully!" : "Upgraded Successfully!"}
            </Text>
            <Text
              style={[
                styles.successDescText,
                { color: colors.mutedForeground },
              ]}
            >
              Your{" "}
              {merchantType === "basic_shop" ? "Basic Store" : "Vendor Store"}{" "}
              has been compiled and is now online.
            </Text>
            <TouchableOpacity
              style={[
                styles.sidebarSubmitBtn,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleClose}
            >
              <Text style={styles.submitBtnText}>Launch Store</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Nav Tabs for Builder */}
            <View style={styles.builderNav}>
              {(
                [
                  "branding",
                  "inventory",
                  "preview",
                  ...(store ? ["settings"] : []),
                ] as const
              ).map((tab) => (
                <Pressable
                  key={tab}
                  style={[
                    styles.builderNavTab,
                    builderTab === tab && {
                      borderBottomColor:
                        tab === "settings" ? "#EF4444" : storeAccent,
                      borderBottomWidth: 2,
                    },
                  ]}
                  onPress={() => setBuilderTab(tab as any)}
                >
                  <Text
                    style={[
                      styles.builderNavText,
                      {
                        color:
                          builderTab === tab
                            ? tab === "settings"
                              ? "#EF4444"
                              : colors.foreground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {tab === "settings" ? "⚙️ SETTINGS" : tab.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Main Form Fields */}
            <ScrollView
              contentContainerStyle={styles.sidebarBody}
              showsVerticalScrollIndicator={false}
            >
              {builderTab === "branding" && (
                <View style={styles.formGroup}>
                  <View style={styles.modalInputGroup}>
                    <Text
                      style={[
                        styles.modalLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Store Name
                    </Text>
                    <TextInput
                      style={[
                        styles.modalInput,
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.border,
                          color: colors.foreground,
                        },
                      ]}
                      placeholder="e.g. Sneaker Plaza"
                      placeholderTextColor={colors.mutedForeground}
                      value={storeName}
                      onChangeText={setStoreName}
                    />
                  </View>

                  <View style={styles.modalInputGroup}>
                    <Text
                      style={[
                        styles.modalLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Store Tagline
                    </Text>
                    <TextInput
                      style={[
                        styles.modalInput,
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.border,
                          color: colors.foreground,
                        },
                      ]}
                      placeholder="e.g. Best kicks in the city"
                      placeholderTextColor={colors.mutedForeground}
                      value={storeTagline}
                      onChangeText={setStoreTagline}
                    />
                  </View>

                  <View style={styles.modalInputGroup}>
                    <Text
                      style={[
                        styles.modalLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Shop Cover Photo
                    </Text>
                    <Pressable
                      style={[
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.border,
                          borderWidth: 1.5,
                          borderRadius: 12,
                          height: 120,
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                        },
                      ]}
                      onPress={() => pickImage(setCoverImageUrl)}
                    >
                      {coverImageUrl ? (
                        <>
                          <Image
                            source={{ uri: coverImageUrl }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                          />
                          <View
                            style={{
                              position: "absolute",
                              bottom: 8,
                              right: 8,
                              backgroundColor: "rgba(0,0,0,0.7)",
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Ionicons name="camera" size={14} color="#fff" />
                            <Text
                              style={{
                                color: "#fff",
                                fontSize: 11,
                                fontFamily: "Inter_700Bold",
                              }}
                            >
                              Change Image
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={{ alignItems: "center", gap: 6 }}>
                          <Ionicons
                            name="image-outline"
                            size={32}
                            color={colors.mutedForeground}
                          />
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 13,
                              fontFamily: "Inter_600SemiBold",
                            }}
                          >
                            Upload Cover Image
                          </Text>
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 10,
                            }}
                          >
                            Supports JPEG, PNG from device
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>

                  {/* Emoji selector */}
                  <View style={styles.modalInputGroup}>
                    <Text
                      style={[
                        styles.modalLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Store Icon (Emoji)
                    </Text>
                    <View style={styles.emojiRow}>
                      {EMOJIS.map((e) => (
                        <Pressable
                          key={e}
                          style={[
                            styles.emojiBtn,
                            storeEmoji === e && {
                              backgroundColor: colors.border,
                            },
                          ]}
                          onPress={() => setStoreEmoji(e)}
                        >
                          <Text style={{ fontSize: 24 }}>{e}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Theme Accents */}
                  <View style={styles.modalInputGroup}>
                    <Text
                      style={[
                        styles.modalLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Branding Accent Color
                    </Text>
                    <View style={styles.accentRow}>
                      {ACCENTS.map((acc) => (
                        <Pressable
                          key={acc}
                          style={[
                            styles.accentDot,
                            { backgroundColor: acc },
                            storeAccent === acc && styles.accentDotActive,
                          ]}
                          onPress={() => setStoreAccent(acc)}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Cover Gradients */}
                  <View style={styles.modalInputGroup}>
                    <Text
                      style={[
                        styles.modalLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Hero Cover Gradient
                    </Text>
                    <View style={styles.gradientRow}>
                      {GRADIENTS.map((grad) => (
                        <Pressable
                          key={grad.name}
                          style={[
                            styles.gradientCard,
                            { borderColor: colors.border },
                            coverGradient[0] === grad.colors[0] && {
                              borderWidth: 2,
                              borderColor: storeAccent,
                            },
                          ]}
                          onPress={() => setCoverGradient(grad.colors)}
                        >
                          <LinearGradient
                            colors={grad.colors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {builderTab === "inventory" && (
                <View style={styles.formGroup}>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {editingProductId
                      ? "Modify product details and save changes."
                      : "Add mock items to stock your store shelves instantly."}
                  </Text>

                  {/* Add / Edit Form */}
                  <View
                    style={[
                      styles.addCard,
                      {
                        backgroundColor: colors.muted,
                        borderColor: colors.border,
                        borderRadius: 14,
                      },
                    ]}
                  >
                    {editingProductId && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                          backgroundColor: storeAccent + "22",
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: storeAccent,
                            fontFamily: "Inter_700Bold",
                            fontSize: 11,
                          }}
                        >
                          EDITING PRODUCT MODE
                        </Text>
                        <TouchableOpacity onPress={handleCancelEdit}>
                          <Text
                            style={{
                              color: "#EF4444",
                              fontFamily: "Inter_700Bold",
                              fontSize: 11,
                            }}
                          >
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <TextInput
                      style={[
                        styles.modalInput,
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.border,
                          color: colors.foreground,
                          marginBottom: 8,
                        },
                      ]}
                      placeholder="Product Name"
                      placeholderTextColor={colors.mutedForeground}
                      value={newProdName}
                      onChangeText={setNewProdName}
                    />
                    <Pressable
                      style={[
                        {
                          backgroundColor: colors.input,
                          borderColor: colors.border,
                          borderWidth: 1.5,
                          borderRadius: 12,
                          height: 90,
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                          marginBottom: 12,
                        },
                      ]}
                      onPress={() => pickImage(setNewProdImageUrl)}
                    >
                      {newProdImageUrl ? (
                        <>
                          <Image
                            source={{ uri: newProdImageUrl }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                          />
                          <View
                            style={{
                              position: "absolute",
                              bottom: 6,
                              right: 6,
                              backgroundColor: "rgba(0,0,0,0.7)",
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Ionicons name="camera" size={12} color="#fff" />
                            <Text
                              style={{
                                color: "#fff",
                                fontSize: 10,
                                fontFamily: "Inter_700Bold",
                              }}
                            >
                              Change
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={{ alignItems: "center", gap: 4 }}>
                          <Ionicons
                            name="camera-outline"
                            size={24}
                            color={colors.mutedForeground}
                          />
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 12,
                              fontFamily: "Inter_600SemiBold",
                            }}
                          >
                            Upload Product Image
                          </Text>
                        </View>
                      )}
                    </Pressable>

                    {/* Category Selection */}
                    <Text
                      style={[
                        styles.modalLabel,
                        {
                          color: colors.mutedForeground,
                          fontSize: 11,
                          marginBottom: 6,
                        },
                      ]}
                    >
                      Product Category
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, marginBottom: 12 }}
                    >
                      {PRODUCT_CATEGORIES.map((cat) => {
                        const isSelected = newProdCategory === cat.label;
                        return (
                          <Pressable
                            key={cat.label}
                            onPress={() => setNewProdCategory(cat.label)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              borderWidth: 1.5,
                              borderColor: isSelected
                                ? storeAccent
                                : colors.border,
                              backgroundColor: isSelected
                                ? storeAccent + "15"
                                : colors.input,
                            }}
                          >
                            <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
                            <Text
                              style={{
                                fontSize: 11,
                                fontFamily: "Inter_700Bold",
                                color: isSelected
                                  ? storeAccent
                                  : colors.mutedForeground,
                              }}
                            >
                              {cat.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        style={[
                          styles.modalInput,
                          {
                            flex: 1,
                            backgroundColor: colors.input,
                            borderColor: colors.border,
                            color: colors.foreground,
                          },
                        ]}
                        placeholder="Price ($)"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="numeric"
                        value={newProdPrice}
                        onChangeText={setNewProdPrice}
                      />
                      <Pressable
                        style={[
                          styles.addProductBtn,
                          { backgroundColor: storeAccent },
                        ]}
                        onPress={handleAddProduct}
                      >
                        <Ionicons
                          name={editingProductId ? "checkmark" : "add"}
                          size={20}
                          color="#fff"
                        />
                        <Text
                          style={{
                            color: "#fff",
                            fontFamily: "Inter_700Bold",
                            fontSize: 13,
                          }}
                        >
                          {editingProductId ? "Save" : "Add"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Current List */}
                  <View style={{ gap: 8, marginTop: 8 }}>
                    <Text
                      style={[
                        styles.modalLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Products Stock ({products.length})
                    </Text>
                    {products.map((p) => (
                      <View
                        key={p.id}
                        style={[
                          styles.prodItemRow,
                          {
                            backgroundColor: colors.input,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        {p.image_url ? (
                          <Image
                            source={{ uri: p.image_url }}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              marginRight: 4,
                            }}
                          />
                        ) : (
                          <Text style={{ fontSize: 20 }}>{storeEmoji}</Text>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: colors.foreground,
                              fontFamily: "Inter_600SemiBold",
                              fontSize: 13,
                            }}
                            numberOfLines={1}
                          >
                            {p.name}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              gap: 6,
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: colors.mutedForeground,
                                fontSize: 11,
                              }}
                            >
                              ${p.price.toFixed(2)}
                            </Text>
                            <View
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: colors.mutedForeground,
                              }}
                            />
                            <Text
                              style={{
                                color: storeAccent,
                                fontSize: 10,
                                fontFamily: "Inter_700Bold",
                              }}
                            >
                              {p.category || "Shoes"}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => {
                              setEditingProductId(p.id);
                              setNewProdName(p.name);
                              setNewProdPrice(String(p.price));
                              setNewProdImageUrl(p.image_url || "");
                              setNewProdCategory(p.category || "Shoes");
                            }}
                          >
                            <Ionicons
                              name="pencil-outline"
                              size={16}
                              color={colors.foreground}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setProducts(products.filter((x) => x.id !== p.id))
                            }
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {builderTab === "preview" && (
                <View style={styles.formGroup}>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Interactive miniature preview matching Super Store
                    architecture.
                  </Text>

                  {/* MINI PREVIEW BOX */}
                  <View
                    style={[
                      styles.miniPreviewCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {/* Cover Hero Gradient or Cover Image */}
                    <View style={[styles.miniPreviewCover, { height: 90 }]}>
                      {coverImageUrl ? (
                        <Image
                          source={{ uri: coverImageUrl }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={coverGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      <View style={styles.miniEmojiCircle}>
                        <Text style={{ fontSize: 20 }}>{storeEmoji}</Text>
                      </View>
                    </View>

                    {/* Stats details */}
                    <View style={styles.miniPreviewInfo}>
                      <View style={styles.miniTitleRow}>
                        <Text
                          style={[
                            styles.miniStoreName,
                            { color: colors.foreground },
                          ]}
                          numberOfLines={1}
                        >
                          {storeName || "My Custom Store"}
                        </Text>
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#4A80F0"
                        />
                      </View>
                      <Text
                        style={[
                          styles.miniTagline,
                          { color: colors.mutedForeground },
                        ]}
                        numberOfLines={1}
                      >
                        {storeTagline || "Configure tagline in Branding"}
                      </Text>

                      {/* Open Tag & Time */}
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          marginVertical: 8,
                        }}
                      >
                        <View style={styles.miniBadge}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: "#22C55E" },
                            ]}
                          />
                          <Text
                            style={{
                              fontSize: 9,
                              color: "#22C55E",
                              fontFamily: "Inter_700Bold",
                            }}
                          >
                            Open
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.miniBadge,
                            { backgroundColor: colors.muted },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              color: colors.mutedForeground,
                            }}
                          >
                            15-25 min
                          </Text>
                        </View>
                      </View>

                      {/* Mini Stats Bar */}
                      <View
                        style={[
                          styles.miniStatsBar,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, alignItems: "center" }}>
                          <Text
                            style={{
                              color: colors.foreground,
                              fontSize: 10,
                              fontFamily: "Inter_800ExtraBold",
                            }}
                          >
                            5.0
                          </Text>
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 8,
                            }}
                          >
                            Rating
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.miniDivider,
                            { backgroundColor: colors.border },
                          ]}
                        />
                        <View style={{ flex: 1, alignItems: "center" }}>
                          <Text
                            style={{
                              color: colors.foreground,
                              fontSize: 10,
                              fontFamily: "Inter_800ExtraBold",
                            }}
                          >
                            {products.length}
                          </Text>
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 8,
                            }}
                          >
                            Products
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.miniDivider,
                            { backgroundColor: colors.border },
                          ]}
                        />
                        <View style={{ flex: 1, alignItems: "center" }}>
                          <Text
                            style={{
                              color: colors.foreground,
                              fontSize: 10,
                              fontFamily: "Inter_800ExtraBold",
                            }}
                          >
                            $15
                          </Text>
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 8,
                            }}
                          >
                            Min Order
                          </Text>
                        </View>
                      </View>

                      {/* Category Pill preview */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, marginVertical: 10 }}
                      >
                        <View
                          style={[
                            styles.miniPill,
                            { backgroundColor: storeAccent },
                          ]}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 9,
                              fontFamily: "Inter_700Bold",
                            }}
                          >
                            All
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.miniPill,
                            { borderColor: colors.border, borderWidth: 1 },
                          ]}
                        >
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 9,
                            }}
                          >
                            New Arrivals
                          </Text>
                        </View>
                      </ScrollView>

                      {/* Products Miniature Grid */}
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 11,
                          fontFamily: "Inter_700Bold",
                          marginBottom: 6,
                        }}
                      >
                        Product Catalog
                      </Text>
                      <View style={styles.miniGrid}>
                        {products.map((p) => (
                          <View
                            key={p.id}
                            style={[
                              styles.miniProductCard,
                              {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.miniProductImg,
                                { backgroundColor: colors.muted },
                              ]}
                            >
                              {p.image_url ? (
                                <Image
                                  source={{ uri: p.image_url }}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    resizeMode: "cover",
                                  }}
                                />
                              ) : (
                                <Text style={{ fontSize: 22 }}>
                                  {storeEmoji}
                                </Text>
                              )}
                            </View>
                            <View style={{ padding: 6 }}>
                              <Text
                                style={[
                                  styles.miniProductName,
                                  { color: colors.foreground },
                                ]}
                                numberOfLines={1}
                              >
                                {p.name}
                              </Text>
                              <Text
                                style={{
                                  color: colors.foreground,
                                  fontSize: 10,
                                  fontFamily: "Inter_800ExtraBold",
                                }}
                              >
                                ${Number(p.price).toFixed(0)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              )}
              {builderTab === "settings" && store && (
                <View style={styles.formGroup}>
                  <Text
                    style={[
                      styles.modalLabel,
                      { color: colors.mutedForeground, marginBottom: 4 },
                    ]}
                  >
                    SHOP VISIBILITY
                  </Text>

                  <View
                    style={[
                      styles.settingsStatusBanner,
                      {
                        backgroundColor: isActive ? "#22C55E14" : "#F9731614",
                        borderColor: isActive ? "#22C55E55" : "#F9731655",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.settingsStatusDot,
                        { backgroundColor: isActive ? "#22C55E" : "#F97316" },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 13,
                          color: isActive ? "#22C55E" : "#F97316",
                        }}
                      >
                        {isActive ? "Shop is Active" : "Shop is Deactivated"}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 11,
                          color: colors.mutedForeground,
                          marginTop: 2,
                        }}
                      >
                        {isActive
                          ? "Your shop is visible in the Marketplace and accepting customers."
                          : "Your shop is hidden from the Marketplace. Reactivate to go live again."}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.settingsDangerRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                      },
                    ]}
                    onPress={handleDeactivateStore}
                    disabled={deactivateLoading || deleteLoading}
                  >
                    <View
                      style={[
                        styles.settingsRowIcon,
                        {
                          backgroundColor: isActive ? "#F9731618" : "#22C55E18",
                        },
                      ]}
                    >
                      {deactivateLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={isActive ? "#F97316" : "#22C55E"}
                        />
                      ) : (
                        <Ionicons
                          name={
                            isActive
                              ? "pause-circle-outline"
                              : "play-circle-outline"
                          }
                          size={22}
                          color={isActive ? "#F97316" : "#22C55E"}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 14,
                          color: isActive ? "#F97316" : "#22C55E",
                        }}
                      >
                        {isActive ? "Deactivate Shop" : "Reactivate Shop"}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                          color: colors.mutedForeground,
                          marginTop: 2,
                        }}
                      >
                        {isActive
                          ? "Temporarily hide your shop from the Marketplace."
                          : "Bring your shop back online and visible to customers."}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>

                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.border,
                      marginVertical: 20,
                    }}
                  />

                  <Text
                    style={[
                      styles.modalLabel,
                      { color: "#EF4444", marginBottom: 4 },
                    ]}
                  >
                    DANGER ZONE
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: colors.mutedForeground,
                      marginBottom: 14,
                    }}
                  >
                    Permanent actions that cannot be undone.
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.settingsDangerRow,
                      {
                        borderColor: "#EF444444",
                        backgroundColor: "#EF444408",
                      },
                    ]}
                    onPress={handleDeleteStore}
                    disabled={deleteLoading || deactivateLoading}
                  >
                    <View
                      style={[
                        styles.settingsRowIcon,
                        { backgroundColor: "#EF444418" },
                      ]}
                    >
                      {deleteLoading ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={22}
                          color="#EF4444"
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 14,
                          color: "#EF4444",
                        }}
                      >
                        Delete This Shop
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                          color: colors.mutedForeground,
                          marginTop: 2,
                        }}
                      >
                        Permanently remove this shop and all its products.
                        Cannot be undone.
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#EF4444"
                    />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions footer inside sidebar */}
            <View
              style={[
                styles.sidebarFooter,
                { borderTopColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              {builderTab !== "settings" && (
                <TouchableOpacity
                  style={[
                    styles.sidebarSubmitBtn,
                    { backgroundColor: storeAccent },
                  ]}
                  onPress={handleSaveStore}
                  disabled={loading || deleteLoading || deactivateLoading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {store
                        ? "Save Changes"
                        : merchantType === "basic_shop"
                          ? "Compile Basic Store"
                          : "Register as Vendor"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Profession Setup Sidebar ──────────────────────────────────────────────────

interface ProfessionSidebarProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  user: User | null;
  store: Store | null;
  onSuccess: () => void;
  onDeliveryPartnerRegistered?: () => void;
}

function ProfessionSidebar({
  visible,
  onClose,
  userId,
  user,
  store,
  onSuccess,
  onDeliveryPartnerRegistered,
}: ProfessionSidebarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"select" | "setup" | "success">("select");
  const [loading, setLoading] = useState(false);

  // Selected Profession
  const [selectedProf, setSelectedProf] = useState("");
  const [selectedProfEmoji, setSelectedProfEmoji] = useState("💼");

  // Branding details
  const [brandName, setBrandName] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [brandAccent, setBrandAccent] = useState("#4A80F0");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const PROFESSIONS = [
    {
      label: "Basic Shop Owner",
      emoji: "🏪",
      desc: "Build a digital catalog storefront to showcase and list standard items.",
      isShop: true,
      type: "basic_shop",
    },
    {
      label: "Independent Vendor",
      emoji: "📦",
      desc: "Become an active vendor, receive order chats, list specialized products.",
      isShop: true,
      type: "vendor",
    },
    {
      label: "Tailor / Fashion Designer",
      emoji: "🧵",
      desc: "Showcase custom tailoring, design collections, and alteration services.",
    },
    {
      label: "Barber",
      emoji: "💈",
      desc: "Offer premium styling, haircuts, beard grooming, and portfolio shots.",
    },
    {
      label: "Hairdresser / Braider",
      emoji: "💇‍♀️",
      desc: "Present beautiful braids, wig styling, extensions, and treatment catalog.",
    },
    {
      label: "Carpenter",
      emoji: "🪚",
      desc: "Show off bespoke woodwork, custom furniture, cabinets, and carpentry.",
    },
    {
      label: "Bricklayer / Builder",
      emoji: "🧱",
      desc: "Showcase masonry, brick construction, structural building, and repairs.",
    },
    {
      label: "Electrician",
      emoji: "⚡",
      desc: "Offer expert electrical wiring, fixture installation, and power fixes.",
    },
    {
      label: "Plumber",
      emoji: "🪠",
      desc: "Showcase drainage repairs, pipe fitting, plumbing installations.",
    },
    {
      label: "Welder / Metal Fabricator",
      emoji: "👨‍🏭",
      desc: "Present custom metal fabrication, heavy welding, iron gates, and grilles.",
    },
    {
      label: "Mechanic (car / motorcycle)",
      emoji: "🔧",
      desc: "Showcase auto repairs, motor servicing, diagnostics, and repairs.",
    },
    {
      label: "Bicycle Repair Technician",
      emoji: "🚲",
      desc: "Offer gear tuning, puncture repairs, custom bike builds, and maintenance.",
    },
    {
      label: "Mobile Money Agent",
      emoji: "📲",
      desc: "Show service coverage for payments, fast transfers, deposits, and cashouts.",
    },
    {
      label: "Photographer / Videographer",
      emoji: "📷",
      desc: "Present event photography, cinematic videos, custom portraits.",
    },
    {
      label: "Caterer / Cook",
      emoji: "🍳",
      desc: "Showcase gourmet meals, event catering, baking recipes, and food plates.",
    },
    {
      label: "Event Decorator",
      emoji: "🎈",
      desc: "Show balloon installations, theme parties, premium flower backdrops.",
    },
    {
      label: "DJ / Sound System Operator",
      emoji: "🎧",
      desc: "Present live sound systems, party mixes, music equipment rental.",
    },
    {
      label: "Private Tutor",
      emoji: "📖",
      desc: "Offer homework assistance, test prep, subject tutoring, and lessons.",
    },
    {
      label: "Graphic Designer / Printer",
      emoji: "🎨",
      desc: "Show logo designs, flyer creations, business card printing services.",
    },
    {
      label: "Computer Repair Technician",
      emoji: "💻",
      desc: "Offer OS installations, laptop screen fixes, software upgrades.",
    },
    {
      label: "House Painter",
      emoji: "🖌️",
      desc: "Present professional interior/exterior paint styling, textured walls.",
    },
    {
      label: "Taxi / Minibus Operator",
      emoji: "🚕",
      desc: "Show taxi bookings, airport pickups, tours, and shuttle routes.",
    },
    {
      label: "Delivery Partner",
      emoji: "🛵",
      desc: "Register as a verified delivery partner for transporting products.",
      type: "delivery_partner",
    },
  ];

  const ACCENTS = ["#4A80F0", "#11998E", "#F7971E", "#7C3AED", "#FF6B6B"];

  // Reanimated sliding config
  const screenWidth = Dimensions.get("window").width;
  const animValue = useSharedValue(screenWidth);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setStep("select");
      setBrandName("");
      setBrandTagline("");
      setBrandAccent("#4A80F0");
      setCoverImageUrl("");
      setSelectedProf("");
      animValue.value = withTiming(0, { duration: 350 });
      backdropOpacity.value = withTiming(1, { duration: 350 });
    } else {
      animValue.value = withTiming(screenWidth, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible]);

  const pickImage = async (onSelected: (uri: string) => void) => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need camera roll permissions to select images.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelected(result.assets[0].uri);
      }
    } catch (e) {
      console.log("Image picker error:", e);
      Alert.alert("Error", "Could not pick image from device.");
    }
  };

  const handleSelectProfession = (prof: (typeof PROFESSIONS)[0]) => {
    setSelectedProf(prof.label);
    setSelectedProfEmoji(prof.emoji);
    setBrandName(`${user?.displayName || "My"} ${prof.label}`);
    setBrandTagline(
      `Expert ${prof.label.toLowerCase()} services and collections`,
    );
    setBrandAccent(ACCENTS[Math.floor(Math.random() * ACCENTS.length)]);
    setCoverImageUrl("");
    setStep("setup");
  };

  const handleSaveProfession = async () => {
    if (!brandName.trim()) {
      Alert.alert("Required", "Please enter a business/brand name.");
      return;
    }
    setLoading(true);
    try {
      // 1. Update user profile title to the chosen profession
      await ProfileService.updateProfile(userId, { title: selectedProf });

      // Delivery partners have their own registration flow — persist and exit
      if (selectedProf === "Delivery Partner") {
        await AsyncStorage.setItem(`delivery_partner_${userId}`, "true");
        onDeliveryPartnerRegistered?.();
        setStep("success");
        onSuccess();
        return;
      }

      // Determine merchant type
      let mType = "basic_shop";
      const matched = PROFESSIONS.find((p) => p.label === selectedProf);
      if (matched && matched.isShop) {
        mType = matched.type as string;
      } else {
        mType = "professional"; // Custom professional brand type!
      }

      // 2. Register/Update corresponding store config
      const config = {
        owner_id: userId,
        name: brandName.trim(),
        tagline: brandTagline.trim(),
        emoji: selectedProfEmoji,
        accent_color: brandAccent,
        cover_gradient_start: "#4A00E0",
        cover_gradient_end: "#8E2DE2",
        cover_image_url: coverImageUrl.trim() || null,
        merchant_type: mType,
        // Pre-stock some sample professional portfolio services if creating a brand new showcase
        products: [
          {
            id: "temp-prof-1",
            name: `Bespoke ${selectedProf} Service`,
            price: 49.99,
            brand: brandName.trim(),
            rating: 5.0,
            category: "Services",
            image_url: "",
          },
          {
            id: "temp-prof-2",
            name: `Premium Portfolio Showcase`,
            price: 99.99,
            brand: brandName.trim(),
            rating: 5.0,
            category: "Portfolio",
            image_url: "",
          },
        ],
      };

      await StoreService.createStore(config as any);

      setStep("success");
      onSuccess();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.message || "Could not register your professional brand.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const sidebarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: animValue.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.sidebarBackdrop, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sidebarSheet,
          sidebarAnimatedStyle,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.sidebarHeader,
            { flexDirection: "row", alignItems: "center", gap: 12 },
          ]}
        >
          <TouchableOpacity
            style={[styles.sidebarCloseBtn, { paddingRight: 6 }]}
            onPress={handleClose}
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.sidebarSubtitle,
                { color: colors.mutedForeground },
              ]}
            >
              Brand & Profession Inception
            </Text>
            <Text
              style={[
                styles.sidebarTitle,
                { color: colors.foreground, fontSize: 18 },
              ]}
            >
              {step === "select"
                ? "Choose Your Path"
                : step === "setup"
                  ? "Design Your Brand"
                  : "Success!"}
            </Text>
          </View>
        </View>

        {step === "select" ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: 100 }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: colors.mutedForeground,
                marginBottom: 4,
              }}
            >
              Select a path below to instantly build a highly polished
              professional showcase brand. Visitors of your profile can view
              your portfolios, services, products, and contact you directly.
            </Text>

            {PROFESSIONS.map((prof) => (
              <Pressable
                key={prof.label}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1.5,
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 4,
                }}
                onPress={() => handleSelectProfession(prof)}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: colors.muted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{prof.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 15,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    {prof.label}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 11,
                      fontFamily: "Inter_500Medium",
                    }}
                    numberOfLines={2}
                  >
                    {prof.desc}
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : step === "setup" ? (
          selectedProf === "Delivery Partner" ? (
            <DeliveryRegistrationForm
              userId={userId}
              onSuccess={() => {
                setStep("success");
                onSuccess();
              }}
              onCancel={() => setStep("select")}
            />
          ) : (
            <>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 18, gap: 16 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: colors.muted,
                    padding: 10,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{selectedProfEmoji}</Text>
                  <View>
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.mutedForeground,
                        fontFamily: "Inter_700Bold",
                        textTransform: "uppercase",
                      }}
                    >
                      SELECTED PROFESSION
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.foreground,
                        fontFamily: "Inter_700Bold",
                      }}
                    >
                      {selectedProf}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text
                    style={[
                      styles.modalLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Brand / Business Name
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="e.g. Nick's Elite Alterations"
                    placeholderTextColor={colors.mutedForeground}
                    value={brandName}
                    onChangeText={setBrandName}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text
                    style={[
                      styles.modalLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Brand Tagline / Bio
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="e.g. Providing high-quality styling"
                    placeholderTextColor={colors.mutedForeground}
                    value={brandTagline}
                    onChangeText={setBrandTagline}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text
                    style={[
                      styles.modalLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Showcase Cover Image
                  </Text>
                  <Pressable
                    style={{
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                      borderWidth: 1.5,
                      borderRadius: 12,
                      height: 120,
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                    }}
                    onPress={() => pickImage(setCoverImageUrl)}
                  >
                    {coverImageUrl ? (
                      <>
                        <Image
                          source={{ uri: coverImageUrl }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                        <View
                          style={{
                            position: "absolute",
                            bottom: 8,
                            right: 8,
                            backgroundColor: "rgba(0,0,0,0.7)",
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Ionicons name="camera" size={14} color="#fff" />
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 11,
                              fontFamily: "Inter_700Bold",
                            }}
                          >
                            Change Image
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={{ alignItems: "center", gap: 6 }}>
                        <Ionicons
                          name="image-outline"
                          size={32}
                          color={colors.mutedForeground}
                        />
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 13,
                            fontFamily: "Inter_600SemiBold",
                          }}
                        >
                          Upload Cover Image
                        </Text>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 10,
                          }}
                        >
                          Select professional banner from device
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text
                    style={[
                      styles.modalLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Brand Accent Color
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                    {ACCENTS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: c,
                          borderWidth: brandAccent === c ? 3 : 0,
                          borderColor: colors.foreground,
                        }}
                        onPress={() => setBrandAccent(c)}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View
                style={[
                  styles.sidebarFooter,
                  {
                    borderTopColor: colors.border,
                    backgroundColor: colors.card,
                    flexDirection: "row",
                    gap: 10,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.sidebarSubmitBtn,
                    { flex: 1, backgroundColor: colors.muted },
                  ]}
                  onPress={() => setStep("select")}
                >
                  <Text
                    style={[styles.submitBtnText, { color: colors.foreground }]}
                  >
                    Back
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sidebarSubmitBtn,
                    { flex: 2, backgroundColor: brandAccent },
                  ]}
                  onPress={handleSaveProfession}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Launch Brand</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )
        ) : (
          <View
            style={[
              styles.successWrapper,
              {
                padding: 32,
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                gap: 16,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
            <Text
              style={[
                styles.successTitleText,
                {
                  color: colors.foreground,
                  fontSize: 22,
                  fontFamily: "Inter_800ExtraBold",
                },
              ]}
            >
              {selectedProf === "Delivery Partner"
                ? "Application Submitted!"
                : "Brand Live & Compiled!"}
            </Text>
            <Text
              style={[
                styles.successDescText,
                {
                  color: colors.mutedForeground,
                  textAlign: "center",
                  fontSize: 14,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              {selectedProf === "Delivery Partner"
                ? "Your delivery partner registration has been submitted and is pending verification. You will be notified once approved."
                : `Congratulations! Your brand as a "${selectedProf}" is now fully set up. Visitors can browse your services, portfolio, and easily message you.`}
            </Text>
            <TouchableOpacity
              style={[
                styles.sidebarSubmitBtn,
                {
                  width: "100%",
                  backgroundColor: colors.primary,
                  marginTop: 14,
                },
              ]}
              onPress={handleClose}
            >
              <Text style={styles.submitBtnText}>
                {selectedProf === "Delivery Partner"
                  ? "Done"
                  : "View My Showcase"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Mock Wishlist Data ───────────────────────────────────────────────────────

const INITIAL_WISHLIST: WishlistItem[] = [
  {
    id: "w1",
    productName: "Nike Air Max 90",
    brand: "Nike",
    price: 225.0,
    category: "Running",
    addedAt: "2d ago",
  },
  {
    id: "w2",
    productName: "Adidas Yeezy 350 V2",
    brand: "Adidas",
    price: 320.0,
    category: "Lifestyle",
    addedAt: "5d ago",
  },
  {
    id: "w3",
    productName: "Jordan 1 Retro High OG",
    brand: "Jordan",
    price: 180.0,
    category: "Basketball",
    addedAt: "1w ago",
  },
  {
    id: "w4",
    productName: "New Balance 990v5",
    brand: "New Balance",
    price: 185.0,
    category: "Running",
    addedAt: "2w ago",
  },
];

// ─── Create Post Modal ────────────────────────────────────────────────────────

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPost: (post: Post) => void;
  userId: string;
}

function CreatePostModal({
  visible,
  onClose,
  onPost,
  userId,
}: CreatePostModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [posting, setPosting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);

  // Recording State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Playback State
  const [playbackSound, setPlaybackSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (playbackSound) {
        playbackSound.unloadAsync();
      }
    };
  }, [playbackSound]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your photos to attach an image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        const uri = result.assets[0].uri;
        setAudioUri(uri);

        // Logical check for music duration using temporary sound object
        try {
          const { sound, status } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: false },
          );
          if (status.isLoaded) {
            const durationMs = status.durationMillis || 0;
            await sound.unloadAsync();
            if (durationMs > 60000) {
              Alert.alert(
                "Audio Trimmed",
                "Your audio track exceeds 1 minute. It will automatically be trimmed to play only the first 60 seconds.",
              );
            }
          }
        } catch (durationErr) {
          console.warn("Could not check audio duration", durationErr);
        }
      }
    } catch (err) {
      console.warn("Document picker error", err);
      Alert.alert("Error", "Could not select the audio file.");
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Microphone access is needed to record voice notes.",
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      // Auto-stop recording at 60 seconds (1 minute limit)
      recording.setOnRecordingStatusUpdate(async (status) => {
        if (status.durationMillis >= 60000) {
          try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setVoiceUri(uri);
            setRecording(null);

            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
            });
            Alert.alert(
              "Recording Limit",
              "Voice notes are limited to 1 minute maximum.",
            );
          } catch (stopErr) {
            console.error("Auto stop recording failed", stopErr);
          }
        }
      });

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Could not start audio recording.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setVoiceUri(uri);
      setRecording(null);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (err) {
      console.error("Failed to stop recording", err);
      Alert.alert("Error", "Could not stop audio recording.");
    }
  };

  const togglePlayback = async (uri: string) => {
    if (playbackSound) {
      if (isPlaying) {
        await playbackSound.pauseAsync();
        setIsPlaying(false);
      } else {
        await playbackSound.playAsync();
        setIsPlaying(true);
      }
    } else {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
        );

        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded) {
            if (status.positionMillis >= 60000) {
              await sound.stopAsync();
              setIsPlaying(false);
              setPlaybackSound(null);
            } else if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackSound(null);
            }
          }
        });

        setPlaybackSound(sound);
        setIsPlaying(true);
      } catch (err) {
        Alert.alert("Playback Error", "Could not play the audio.");
      }
    }
  };

  const handlePost = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      Alert.alert("Empty Post", "Write something before posting.");
      return;
    }
    setPosting(true);

    const tags = tagsRaw
      .split(/[\s,#]+/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const mediaFiles: { uri: string; name: string }[] = [];
    if (imageUri) {
      mediaFiles.push({ uri: imageUri, name: `image_${Date.now()}.jpg` });
    }
    if (audioUri) {
      mediaFiles.push({ uri: audioUri, name: `music_${Date.now()}.m4a` });
    }
    if (voiceUri) {
      mediaFiles.push({ uri: voiceUri, name: `voice_${Date.now()}.m4a` });
    }

    try {
      const createdPost = await ProfileService.createPost(
        userId,
        trimmed,
        tags,
        mediaFiles,
      );
      onPost(createdPost);

      // Clear states
      setContent("");
      setTagsRaw("");
      setImageUri(null);
      setAudioUri(null);
      setVoiceUri(null);
      onClose();
    } catch (err) {
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    if (content.trim() || imageUri || audioUri || voiceUri) {
      Alert.alert("Discard Post?", "Your draft will be lost.", [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setContent("");
            setTagsRaw("");
            setImageUri(null);
            setAudioUri(null);
            setVoiceUri(null);
            onClose();
          },
        },
      ]);
    } else {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View
        style={[
          createPostStyles.fullScreenContainer,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        {/* ── Header ── */}
        <View
          style={[
            createPostStyles.header,
            { borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={handleClose}
            style={createPostStyles.cancelBtn}
          >
            <Text
              style={[
                createPostStyles.cancelText,
                { color: colors.mutedForeground },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[createPostStyles.title, { color: colors.foreground }]}>
            New Post
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Dev diagnostic — remove before shipping to production */}
            <TouchableOpacity
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: "#f59e0b22",
              }}
              onPress={async () => {
                const report = await ProfileService.diagnoseBucket();
                Alert.alert("Bucket Diagnostic", report);
              }}
            >
              <Text
                style={{ color: "#f59e0b", fontSize: 11, fontWeight: "600" }}
              >
                Test Bucket
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                createPostStyles.postBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: posting || !content.trim() ? 0.5 : 1,
                },
              ]}
              onPress={handlePost}
              disabled={posting || !content.trim()}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={createPostStyles.postBtnText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Media toolbar ── */}
        <View
          style={[
            createPostStyles.mediaToolbar,
            { borderBottomColor: colors.border },
          ]}
        >
          <Pressable
            onPress={pickImage}
            style={[
              createPostStyles.mediaBtn,
              imageUri ? { backgroundColor: colors.primary + "22" } : null,
            ]}
          >
            <Ionicons
              name="image-outline"
              size={22}
              color={imageUri ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                createPostStyles.mediaBtnLabel,
                { color: imageUri ? colors.primary : colors.mutedForeground },
              ]}
            >
              {imageUri ? "Image ✓" : "Image"}
            </Text>
          </Pressable>

          <Pressable
            onPress={pickAudio}
            style={[
              createPostStyles.mediaBtn,
              audioUri ? { backgroundColor: colors.primary + "22" } : null,
            ]}
          >
            <Ionicons
              name="musical-note-outline"
              size={22}
              color={audioUri ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                createPostStyles.mediaBtnLabel,
                { color: audioUri ? colors.primary : colors.mutedForeground },
              ]}
            >
              {audioUri ? "Audio ✓" : "Music"}
            </Text>
          </Pressable>

          <Pressable
            onPress={
              isRecording
                ? stopRecording
                : voiceUri
                  ? () => setVoiceUri(null)
                  : startRecording
            }
            style={[
              createPostStyles.mediaBtn,
              isRecording
                ? { backgroundColor: "#FF3B3022" }
                : voiceUri
                  ? { backgroundColor: colors.primary + "22" }
                  : null,
            ]}
          >
            <Ionicons
              name={isRecording ? "stop-circle-outline" : "mic-outline"}
              size={22}
              color={
                isRecording
                  ? "#FF3B30"
                  : voiceUri
                    ? colors.primary
                    : colors.mutedForeground
              }
            />
            <Text
              style={[
                createPostStyles.mediaBtnLabel,
                {
                  color: isRecording
                    ? "#FF3B30"
                    : voiceUri
                      ? colors.primary
                      : colors.mutedForeground,
                },
              ]}
            >
              {isRecording ? "Recording..." : voiceUri ? "Voice ✓" : "Voice"}
            </Text>
          </Pressable>
        </View>

        {/* ── Image preview ── */}
        {imageUri ? (
          <View style={createPostStyles.imagePreviewWrapper}>
            <Image
              source={{ uri: imageUri }}
              style={createPostStyles.imagePreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={createPostStyles.removeImageBtn}
              onPress={() => setImageUri(null)}
            >
              <Ionicons name="close-circle" size={24} color="#fff" />
            </TouchableOpacity>
            {audioUri ? (
              <View style={createPostStyles.audioOverlay}>
                <Ionicons name="musical-notes" size={14} color="#fff" />
                <Text style={createPostStyles.audioOverlayText}>
                  Music attached
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Voice preview player (if voice note exists) ── */}
        {voiceUri ? (
          <View style={createPostStyles.voiceNotePreviewWrapper}>
            <View
              style={[
                createPostStyles.voiceNoteCard,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={() => togglePlayback(voiceUri)}
                style={createPostStyles.voicePlayBtn}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <Text
                style={[
                  createPostStyles.voiceNoteText,
                  { color: colors.foreground },
                ]}
              >
                {isPlaying ? "Playing voice note..." : "Voice Note Recorded"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setVoiceUri(null);
                  if (playbackSound) {
                    playbackSound.unloadAsync();
                    setPlaybackSound(null);
                    setIsPlaying(false);
                  }
                }}
                style={createPostStyles.voiceNoteRemoveBtn}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ── Content input (scrollable) ── */}
        <TextInput
          style={[createPostStyles.contentInput, { color: colors.foreground }]}
          placeholder="What's on your mind? Share a look, drop, or review..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={500}
          value={content}
          onChangeText={setContent}
          autoFocus
          textAlignVertical="top"
        />

        <Text
          style={[
            createPostStyles.charCount,
            { color: colors.mutedForeground },
          ]}
        >
          {content.length}/500
        </Text>

        {/* ── Tags input ── */}
        <View
          style={[
            createPostStyles.tagsRow,
            {
              borderColor: colors.border,
              backgroundColor: colors.input,
              marginBottom: insets.bottom + 16,
            },
          ]}
        >
          <Ionicons
            name="pricetag-outline"
            size={16}
            color={colors.mutedForeground}
          />
          <TextInput
            style={[createPostStyles.tagsInput, { color: colors.foreground }]}
            placeholder="Add tags, e.g. Nike AirMax Hype"
            placeholderTextColor={colors.mutedForeground}
            value={tagsRaw}
            onChangeText={setTagsRaw}
            returnKeyType="done"
          />
        </View>
      </View>
    </Modal>
  );
}

const createPostStyles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 320,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  postBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  postBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  // ── Media toolbar ──
  mediaToolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mediaBtn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  mediaBtnLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  // ── Image preview ──
  imagePreviewWrapper: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
  },
  audioOverlay: {
    position: "absolute",
    bottom: 8,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  audioOverlayText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  // ── Content ──
  contentInput: {
    paddingHorizontal: 20,
    paddingTop: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    minHeight: 120,
    flex: 1,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
    paddingRight: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagsInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  voiceNotePreviewWrapper: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  voiceNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceNoteText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  voiceNoteRemoveBtn: {
    padding: 4,
  },
});

// ─── Main ProfileScreen ───────────────────────────────────────────────────────

interface ProfileScreenProps {
  userId: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onEditPress?: () => void;
}

export function ProfileScreen({
  userId,
  showBackButton,
  onBack,
  onEditPress,
}: ProfileScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { currentUser } = useChat();
  const { user, posts, isLoading, error, refresh } = useProfile(userId);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  const isOwn = userId === currentUser?.id;
  const { stores, store, refreshStore, selectActiveStore } = useStore(userId);
  const hasShop = !!store || !!user?.title;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [professionModalVisible, setProfessionModalVisible] = useState(false);

  // Track delivery partner registration — persisted per user in AsyncStorage
  const [isDeliveryPartner, setIsDeliveryPartner] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(`delivery_partner_${userId}`).then((val) => {
      if (val === "true") setIsDeliveryPartner(true);
    });
  }, [userId]);

  // Local posts state — supports create + delete without refetching
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [postsReady, setPostsReady] = useState(false);
  const [createPostVisible, setCreatePostVisible] = useState(false);

  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(
    isOwn ? INITIAL_WISHLIST : [],
  );

  // Sync remote posts → local state on first load
  useEffect(() => {
    if (posts.length > 0 || (!isLoading && !postsReady)) {
      setLocalPosts(posts);
      setPostsReady(true);
    }
  }, [posts, isLoading]);

  const handleDeletePost = useCallback((postId: string) => {
    setLocalPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleCreatePost = useCallback((newPost: Post) => {
    setLocalPosts((prev) => [newPost, ...prev]);
  }, []);

  const handleShare = useCallback(async () => {
    if (!user) return;
    try {
      const profileUrl = `https://doorstep.app/profile/${user.username}`;
      await Share.share({
        title: `${user.displayName} on Doorstep`,
        message: `Check out ${user.displayName}'s profile on Doorstep 🏡\n${profileUrl}`,
        url: profileUrl,
      });
    } catch {}
  }, [user]);

  const handleRefresh = useCallback(() => {
    refresh();
    refreshStore();
  }, [refresh, refreshStore]);

  // Re-fetch the profile every time this screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh]),
  );

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <ProfilePostCard
        post={item}
        isOwn={isOwn}
        onDelete={() => handleDeletePost(item.id)}
      />
    ),
    [isOwn, handleDeletePost],
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
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
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
        {showBackButton && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.mutedForeground}
        />
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
        if (selectedItemId === "delivery_partner") {
          return <DeliveryDashboard />;
        }
        if (store) {
          return (
            <View style={{ padding: 18, gap: 14 }}>
              {/* Horizontal selector bar for multiple stores/professions */}
              {(stores.length > 1 || (isOwn && stores.length > 0)) && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
                >
                  {stores.map((s) => {
                    const isActive = s.id === store.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: isActive
                            ? store.accent_color
                            : colors.card,
                          borderColor: isActive
                            ? store.accent_color
                            : colors.border,
                          borderWidth: 1.5,
                          borderRadius: 20,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                        }}
                        onPress={() => selectActiveStore(s.id)}
                      >
                        <Text style={{ fontSize: 14 }}>{s.emoji}</Text>
                        <Text
                          style={{
                            color: isActive ? "#fff" : colors.foreground,
                            fontSize: 12,
                            fontFamily: "Inter_700Bold",
                          }}
                        >
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Delivery Partner pill — only shown if user is a registered delivery partner */}
                  {isDeliveryPartner && (
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor:
                          selectedItemId === "delivery_partner"
                            ? colors.accent
                            : colors.muted,
                        borderColor:
                          selectedItemId === "delivery_partner"
                            ? colors.accent
                            : colors.border,
                        borderWidth: 1.5,
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                      onPress={() => setSelectedItemId("delivery_partner")}
                    >
                      <Ionicons
                        name="bicycle"
                        size={14}
                        color={
                          selectedItemId === "delivery_partner"
                            ? "#fff"
                            : colors.foreground
                        }
                      />
                      <Text
                        style={{
                          color:
                            selectedItemId === "delivery_partner"
                              ? "#fff"
                              : colors.foreground,
                          fontSize: 12,
                          fontFamily: "Inter_700Bold",
                        }}
                      >
                        Delivery Partner
                      </Text>
                    </TouchableOpacity>
                  )}
                  {isOwn && (
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: colors.muted,
                        borderColor: colors.border,
                        borderWidth: 1.5,
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                      onPress={() => setProfessionModalVisible(true)}
                    >
                      <Ionicons
                        name="add"
                        size={14}
                        color={colors.foreground}
                      />
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 12,
                          fontFamily: "Inter_700Bold",
                        }}
                      >
                        Create New...
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
              {/* Premium Store Header Card */}
              <View
                style={{
                  width: "100%",
                  borderColor: store.accent_color + "77",
                  borderWidth: 1.5,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: colors.card,
                }}
              >
                {/* Cover gradient or image */}
                <View
                  style={{
                    height: 120,
                    position: "relative",
                    justifyContent: "flex-end",
                  }}
                >
                  {store.cover_image_url ? (
                    <Image
                      source={{ uri: store.cover_image_url }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={[
                        store.cover_gradient_start,
                        store.cover_gradient_end,
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <LinearGradient
                    colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.65)"]}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Emoji overlay */}
                  <View
                    style={{
                      position: "absolute",
                      bottom: -20,
                      left: 16,
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      backgroundColor: colors.card,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: colors.border,
                      elevation: 4,
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>{store.emoji}</Text>
                  </View>
                </View>

                {/* Store details */}
                <View style={{ padding: 16, paddingTop: 28, gap: 4 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 18,
                          fontFamily: "Inter_800ExtraBold",
                        }}
                      >
                        {store.name}
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 12,
                          fontFamily: "Inter_500Medium",
                        }}
                        numberOfLines={1}
                      >
                        {store.tagline}
                      </Text>
                    </View>
                    {isOwn && (
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: store.accent_color,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                        }}
                        onPress={() => setModalVisible(true)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={16}
                          color="#fff"
                        />
                        <Text
                          style={{
                            color: "#fff",
                            fontFamily: "Inter_700Bold",
                            fontSize: 12,
                          }}
                        >
                          {store.merchant_type === "professional"
                            ? "Edit Brand"
                            : "Edit Shop"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: colors.muted,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Ionicons
                        name={
                          store.merchant_type === "professional"
                            ? "sparkles-outline"
                            : "cube-outline"
                        }
                        size={12}
                        color={colors.mutedForeground}
                      />
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 11,
                          fontFamily: "Inter_600SemiBold",
                        }}
                      >
                        {store.products?.length || 0}{" "}
                        {store.merchant_type === "professional"
                          ? "Services"
                          : "Items"}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: colors.muted,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Ionicons
                        name={
                          store.merchant_type === "professional"
                            ? "briefcase-outline"
                            : "storefront-outline"
                        }
                        size={12}
                        color={colors.mutedForeground}
                      />
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 11,
                          fontFamily: "Inter_600SemiBold",
                        }}
                        numberOfLines={1}
                      >
                        {store.merchant_type === "basic_shop"
                          ? "Basic Store"
                          : store.merchant_type === "vendor"
                            ? "Vendor Store"
                            : `${user?.title || "Professional"}`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {!store.products || store.products.length === 0 ? (
                <EmptyTab
                  icon={
                    store.merchant_type === "professional"
                      ? "briefcase-outline"
                      : "storefront-outline"
                  }
                  title={
                    store.merchant_type === "professional"
                      ? "No Services Yet"
                      : "No Products Yet"
                  }
                  subtitle={
                    store.merchant_type === "professional"
                      ? "Your portfolio services will appear here"
                      : "Your store products will appear here"
                  }
                />
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 12,
                    marginTop: 8,
                  }}
                >
                  {store.products.map((p) => (
                    <View
                      key={p.id}
                      style={{
                        width: CARD_W,
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 16,
                        overflow: "hidden",
                        elevation: 4,
                      }}
                    >
                      <View
                        style={{
                          height: 120,
                          backgroundColor: colors.muted,
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        {p.image_url ? (
                          <Image
                            source={{ uri: p.image_url }}
                            style={{
                              width: "100%",
                              height: "100%",
                              resizeMode: "cover",
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              backgroundColor: colors.card,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ fontSize: 24 }}>{store.emoji}</Text>
                          </View>
                        )}
                        <View
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            backgroundColor: store.accent_color,
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 9,
                              fontFamily: "Inter_700Bold",
                              textTransform: "uppercase",
                            }}
                          >
                            {p.category ||
                              (store.merchant_type === "professional"
                                ? "Service"
                                : "Shoes")}
                          </Text>
                        </View>
                      </View>
                      <View style={{ padding: 10, gap: 2 }}>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 10,
                            fontFamily: "Inter_600SemiBold",
                          }}
                        >
                          {p.brand || `${user?.title || "Professional"}`}
                        </Text>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontSize: 13,
                            fontFamily: "Inter_700Bold",
                          }}
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                        <Text
                          style={{
                            color: store.accent_color,
                            fontSize: 14,
                            fontFamily: "Inter_800ExtraBold",
                            marginTop: 2,
                          }}
                        >
                          ${Number(p.price).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }
        return (
          <View style={{ padding: 18, gap: 14 }}>
            <EmptyTab
              icon="storefront-outline"
              title="No Active Brand or Shops"
              subtitle={
                isOwn
                  ? "Setup a professional showcase, design portfolio, or digital storefront catalog to list your crafts, services, and products."
                  : "This user hasn't active storefronts or portfolios yet."
              }
            />
            {isOwn && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  padding: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 6,
                }}
                onPress={() => setProfessionModalVisible(true)}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: "Inter_700Bold",
                    fontSize: 14,
                  }}
                >
                  Launch Brand or Shop
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      case "wishlist":
        if (wishlistItems.length === 0) {
          return (
            <View style={{ padding: 16 }}>
              <EmptyTab
                icon="heart-outline"
                title="Wishlist is Empty"
                subtitle={
                  isOwn
                    ? "Browse the marketplace and save items you love"
                    : "This user hasn't added items to their wishlist yet"
                }
              />
            </View>
          );
        }
        return (
          <View style={{ padding: 16, gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 16,
                  fontFamily: "Inter_700Bold",
                }}
              >
                Saved Items
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 13,
                  fontFamily: "Inter_500Medium",
                }}
              >
                {wishlistItems.length}{" "}
                {wishlistItems.length === 1 ? "item" : "items"}
              </Text>
            </View>
            {wishlistItems.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.wishlistCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* Product icon placeholder */}
                <View
                  style={[
                    styles.wishlistImgPlaceholder,
                    { backgroundColor: colors.muted },
                  ]}
                >
                  <Ionicons
                    name="footsteps-outline"
                    size={28}
                    color={colors.mutedForeground}
                  />
                </View>
                {/* Details */}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 11,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    {item.brand} · {item.category}
                  </Text>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 14,
                      fontFamily: "Inter_700Bold",
                    }}
                    numberOfLines={1}
                  >
                    {item.productName}
                  </Text>
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 15,
                      fontFamily: "Inter_800ExtraBold",
                    }}
                  >
                    ${item.price.toFixed(2)}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 11,
                      fontFamily: "Inter_400Regular",
                    }}
                  >
                    Added {item.addedAt}
                  </Text>
                </View>
                {/* Actions */}
                <View style={{ gap: 8, alignItems: "center" }}>
                  <TouchableOpacity
                    style={[
                      styles.wishlistActionBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {}}
                  >
                    <Ionicons name="cart-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  {isOwn && (
                    <TouchableOpacity
                      style={[
                        styles.wishlistActionBtn,
                        {
                          backgroundColor: "#EF444415",
                          borderWidth: 1,
                          borderColor: "#EF444430",
                        },
                      ]}
                      onPress={() =>
                        setWishlistItems((prev) =>
                          prev.filter((w) => w.id !== item.id),
                        )
                      }
                    >
                      <Ionicons
                        name="heart-dislike-outline"
                        size={16}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        );
      case "about":
        return <AboutTab user={user} />;
      default:
        return null;
    }
  };

  const headerContent = (
    <>
      <View
        style={[
          styles.pageHeader,
          {
            paddingTop: topPad + 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10,
          },
        ]}
      >
        {showBackButton ? (
          <TouchableOpacity
            style={[styles.backCircle, { backgroundColor: "rgba(0,0,0,0.45)" }]}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}

        {isOwn && (
          <TouchableOpacity
            style={[
              styles.headerIconBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => setProfessionModalVisible(true)}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={colors.foreground}
            />
          </TouchableOpacity>
        )}
      </View>
      <ProfileHeader
        user={user}
        isOwn={isOwn}
        onEditPress={onEditPress}
        onSharePress={handleShare}
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
          data={localPosts}
          renderItem={renderPost}
          keyExtractor={keyExtractor}
          ListHeaderComponent={
            <>
              {headerContent}
              <ProfileTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hasShop={hasShop}
              />
              {/* Create Post button — own profile only */}
              {isOwn && (
                <TouchableOpacity
                  style={[
                    styles.createPostBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setCreatePostVisible(true)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.createPostAvatar,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </View>
                  <Text
                    style={[
                      styles.createPostPlaceholder,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Share a drop, review, or find...
                  </Text>
                  <View
                    style={[
                      styles.createPostPillBtn,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.createPostPillText}>Post</Text>
                  </View>
                </TouchableOpacity>
              )}
              <View style={{ height: 6 }} />
            </>
          }
          ListEmptyComponent={
            <EmptyTab
              icon="newspaper-outline"
              title="No Posts Yet"
              subtitle={
                isOwn
                  ? "Be the first to share something!"
                  : "This user hasn't posted yet"
              }
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          stickyHeaderIndices={[]}
        />
        <ShopVendorSidebar
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          userId={userId}
          store={store}
          onSuccess={handleRefresh}
        />
        <ProfessionSidebar
          visible={professionModalVisible}
          onClose={() => setProfessionModalVisible(false)}
          userId={userId}
          user={user}
          store={store}
          onSuccess={handleRefresh}
          onDeliveryPartnerRegistered={() => setIsDeliveryPartner(true)}
        />
        <CreatePostModal
          visible={createPostVisible}
          onClose={() => setCreatePostVisible(false)}
          onPost={handleCreatePost}
          userId={userId}
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
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasShop={hasShop}
        />
        <View>{renderTabContent()}</View>
      </ScrollView>
      <ShopVendorSidebar
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        userId={userId}
        store={store}
        onSuccess={handleRefresh}
      />
      <ProfessionSidebar
        visible={professionModalVisible}
        onClose={() => setProfessionModalVisible(false)}
        userId={userId}
        user={user}
        store={store}
        onSuccess={handleRefresh}
        onDeliveryPartnerRegistered={() => setIsDeliveryPartner(true)}
      />
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
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: "Inter_800ExtraBold",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutContainer: {
    padding: 16,
    gap: 16,
  },
  aboutCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  aboutSection: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  aboutBio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aboutRowLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    width: 120,
  },
  aboutRowValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sidebarSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    elevation: 20,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  sidebarTitle: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
  },
  sidebarSubtitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  sidebarCloseBtn: {
    padding: 6,
  },
  sidebarBody: {
    padding: 18,
    paddingBottom: 100,
  },
  choiceSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 22,
    marginBottom: 20,
    marginTop: 4,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 0,
    borderWidth: 2,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  choiceIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  choiceCardTitle: {
    fontSize: 17,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  choiceCardDesc: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  toggleBar: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginTop: 14,
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginBottom: 16,
  },
  builderNav: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    marginHorizontal: 18,
    marginTop: 14,
  },
  builderNavTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  builderNavText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  formGroup: {
    gap: 18,
  },
  modalInputGroup: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  emojiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
  },
  emojiBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  accentRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
  },
  accentDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  accentDotActive: {
    borderWidth: 3,
    borderColor: "#fff",
    transform: [{ scale: 1.15 }],
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  gradientRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
  },
  gradientCard: {
    width: 52,
    height: 38,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  addCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  addProductBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    height: 48,
  },
  prodItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  miniPreviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  miniPreviewCover: {
    height: 80,
    justifyContent: "flex-end",
    position: "relative",
  },
  miniEmojiCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: -14,
    left: 14,
    zIndex: 2,
  },
  miniPreviewInfo: {
    padding: 14,
    paddingTop: 20,
  },
  miniTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniStoreName: {
    fontSize: 14,
    fontFamily: "Inter_800ExtraBold",
  },
  miniTagline: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  miniBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniStatsBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
  },
  miniDivider: {
    width: 1,
    height: 20,
  },
  miniPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  miniGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  miniProductCard: {
    width: "47%",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  miniProductImg: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  miniProductName: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 12,
    marginBottom: 2,
  },
  sidebarFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  sidebarSubmitBtn: {
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  // ── Settings Tab ──────────────────────────────────────────────────────────────
  settingsStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  settingsStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  settingsDangerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingsRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  successWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  successTitleText: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  successDescText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 18,
  },
  // ── Create Post Bar ───────────────────────────────────────────────────────────
  createPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  createPostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  createPostPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  createPostPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  createPostPillText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  // ── Wishlist Card ─────────────────────────────────────────────────────────────
  wishlistCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  wishlistImgPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  wishlistActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
