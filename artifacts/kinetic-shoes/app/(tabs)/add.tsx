import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import Map from "@/components/Map";
import { useCart } from "@/context/CartContext";

const { width } = Dimensions.get("window");

type DeliveryType = "Pickup" | "Delivery";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 20 : insets.top;
  
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();
  
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("Pickup");
  const [showMap, setShowMap] = useState(false);
  const [trackedItems, setTrackedItems] = useState<any[]>([]);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Copy current items to tracker state
    setTrackedItems([...cartItems]);
    
    // Clear cart and show tracker
    clearCart();
    setShowMap(true);
  };

  // If the cart is empty and we're not currently tracking a checked-out order
  if (cartItems.length === 0 && !showMap) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Cart</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="bag-handle-outline" size={80} color={colors.mutedForeground} />
          <Text style={[styles.emptyCartTitle, { color: colors.foreground }]}>Your Cart is Empty</Text>
          <Text style={[styles.emptyCartSubtitle, { color: colors.mutedForeground }]}>
            Explore the marketplace to add dynamic products!
          </Text>
          <Pressable
            style={[styles.emptyCartBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/messages")}
          >
            <Text style={styles.emptyCartBtnText}>Browse Marketplace</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Standard Cart List ───
  if (!showMap) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Cart</Text>
          <Pressable onPress={clearCart} style={styles.clearBtn}>
            <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>Clear All</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {cartItems.map((item) => (
            <View
              key={item.id}
              style={[
                styles.verticalCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.imageWrapper}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                ) : item.imageSource ? (
                  <Image source={item.imageSource} style={styles.productImage} />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted }}>
                    <Text style={{ fontSize: 32 }}>👟</Text>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.statusText}>Size {item.selectedSize}</Text>
                </View>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.titleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.productBrand, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.brand} ({item.shopName})
                    </Text>
                    <Text style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeFromCart(item.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </Pressable>
                </View>

                <View style={styles.actionRow}>
                  <Text style={[styles.productPrice, { color: colors.foreground }]}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                  
                  {/* Quantity Controller */}
                  <View style={[styles.qtyControl, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Ionicons name="remove" size={16} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.qtyValue, { color: colors.foreground }]}>{item.quantity}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={16} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Checkout Sticky Bottom */}
        <View style={[styles.checkoutSticky, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.totalBlock}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>${getCartTotal().toFixed(2)}</Text>
          </View>
          <Pressable style={[styles.checkoutBtn, { backgroundColor: colors.foreground }]} onPress={handleCheckout}>
            <Text style={[styles.checkoutBtnText, { color: colors.background }]}>Secure Checkout</Text>
            <Ionicons name="lock-closed" size={16} color={colors.background} />
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Live Tracker / Map View (Triggered after Checkout) ───
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Map colors={colors} styles={styles} />

      {/* Top Header Control */}
      <View style={[styles.topControlContainer, { paddingTop: topPad + 12 }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowMap(false)}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>

        <View style={[styles.segmentedControl, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            style={[
              styles.segmentBtn,
              deliveryType === "Pickup" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setDeliveryType("Pickup")}
          >
            <Text
              style={[
                styles.segmentText,
                { color: deliveryType === "Pickup" ? "#FFFFFF" : colors.foreground },
              ]}
            >
              Pick up
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.segmentBtn,
              deliveryType === "Delivery" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setDeliveryType("Delivery")}
          >
            <Text
              style={[
                styles.segmentText,
                { color: deliveryType === "Delivery" ? "#FFFFFF" : colors.foreground },
              ]}
            >
              Delivery
            </Text>
          </Pressable>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Floating Info Badge */}
      <View style={[styles.fabContainer, { bottom: 270 }]}>
        <Pressable style={[styles.fab, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="bicycle" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Bottom Checked out Items ScrollView */}
      <View style={styles.bottomSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {trackedItems.map((item) => (
            <View
              key={item.id}
              style={[
                styles.productCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.imageWrapper}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                ) : item.imageSource ? (
                  <Image source={item.imageSource} style={styles.productImage} />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted }}>
                    <Text style={{ fontSize: 24 }}>👟</Text>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: colors.primary, top: 12, right: 12, bottom: "auto" }]}>
                  <Text style={[styles.statusText, { color: "#FFFFFF" }]}>
                    In Transit
                  </Text>
                </View>
              </View>

              <View style={styles.cardInfo}>
                <Text style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.productSubtitle, { color: colors.mutedForeground }]}>
                  Size {item.selectedSize} · Qty {item.quantity}
                </Text>

                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#FFB300" />
                  <Text style={[styles.ratingText, { color: colors.foreground }]}>{item.rating || 5.0}</Text>
                  <Text style={[styles.likesText, { color: colors.mutedForeground }]}>
                    Tracked Order
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_800ExtraBold",
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyCartSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyCartBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  emptyCartBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 160,
    gap: 16,
  },
  verticalCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageWrapper: {
    height: 150,
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  statusBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  cardInfo: {
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  productBrand: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  productTitle: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  productPrice: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  qtyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  qtyValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 8,
  },
  checkoutSticky: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  totalBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  totalValue: {
    fontSize: 22,
    fontFamily: "Inter_800ExtraBold",
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  checkoutBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginLeft: 16,
  },
  topControlContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    width: "80%",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  fabContainer: {
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 90,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  productCard: {
    width: width * 0.75,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  productSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
    marginRight: 12,
  },
  likesText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
