import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Animated, Image, TextInput, Dimensions, Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import Map from "@/components/Map";
import DeliveryTimeline, { DELIVERY_STAGES } from "@/components/checkout/DeliveryTimeline";
import PaymentStep, { PAYMENT_METHODS } from "@/components/checkout/PaymentStep";

const { width } = Dimensions.get("window");
const DELIVERY_FEE = 1.5;

type CheckoutStep = "cart" | "details" | "payment" | "success" | "tracking";
type DeliveryType  = "Pickup" | "Delivery";

const MOCK_DRIVERS = [
  { name: "Chisomo Banda",  rating: 4.9, initials: "CB" },
  { name: "Tiwonge Phiri",  rating: 4.8, initials: "TP" },
  { name: "Limbani Mwale",  rating: 4.7, initials: "LM" },
];

function orderId() {
  return `DRP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ─── Step header ──────────────────────────────────────────────────────────────
function StepHeader({
  title, subtitle, step, totalSteps, onBack, colors,
}: {
  title: string; subtitle: string;
  step: number; totalSteps: number;
  onBack: () => void; colors: any;
}) {
  return (
    <View style={sh.wrap}>
      <Pressable onPress={onBack} style={[sh.back, { backgroundColor: colors.muted }]} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={colors.foreground} />
      </Pressable>
      <View style={sh.titles}>
        <Text style={[sh.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[sh.sub, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      <View style={[sh.badge, { backgroundColor: colors.primary + "18" }]}>
        <Text style={[sh.badgeTxt, { color: colors.primary }]}>{step}/{totalSteps}</Text>
      </View>
    </View>
  );
}
const sh = StyleSheet.create({
  wrap:     { flexDirection:"row", alignItems:"center", gap:12, paddingBottom:20 },
  back:     { width:38, height:38, borderRadius:12, alignItems:"center", justifyContent:"center" },
  titles:   { flex:1 },
  title:    { fontSize:18, fontFamily:"Inter_800ExtraBold", lineHeight:22 },
  sub:      { fontSize:13, fontFamily:"Inter_400Regular", marginTop:1 },
  badge:    { paddingHorizontal:10, paddingVertical:4, borderRadius:20 },
  badgeTxt: { fontSize:12, fontFamily:"Inter_700Bold" },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function CartScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const topPad  = Platform.OS === "web" ? 20 : insets.top;
  const isDark  = colors.background === "#121212";
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();

  // ── Step state ──
  const [step, setStep]               = useState<CheckoutStep>("cart");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("Delivery");
  const [address, setAddress]           = useState("Area 47, Lilongwe, Malawi");
  const [instructions, setInstructions] = useState("");
  const [paymentId, setPaymentId]       = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [trackedItems, setTrackedItems]     = useState<typeof cartItems>([]);
  const [deliveryStage, setDeliveryStage]   = useState(0);
  const [etaMinutes, setEtaMinutes]         = useState(18);
  const [driver] = useState(MOCK_DRIVERS[Math.floor(Math.random() * MOCK_DRIVERS.length)]);

  // ── Animations ──
  const slideAnim    = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successCheckOpacity = useRef(new Animated.Value(0)).current;
  const panelSlide   = useRef(new Animated.Value(0)).current;

  const haptic = useCallback((style: "light"|"medium"|"success") => {
    if (Platform.OS === "web") return;
    if (style === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (style === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const navigateTo = useCallback((next: CheckoutStep) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 18, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,  duration: 200, useNativeDriver: true }),
    ]).start();
    setStep(next);
    haptic("light");
  }, [slideAnim, haptic]);

  // Success → auto-go to tracking
  useEffect(() => {
    if (step !== "success") return;
    Animated.sequence([
      Animated.spring(successScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(successCheckOpacity, { toValue: 1, duration: 300, delay: 100, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      setStep("tracking");
      // Animate panel up
      Animated.spring(panelSlide, { toValue: 1, friction: 7, useNativeDriver: true }).start();
    }, 2800);
    return () => clearTimeout(t);
  }, [step]);

  // Panel animation when tracking starts
  useEffect(() => {
    if (step === "tracking") {
      Animated.spring(panelSlide, { toValue: 1, friction: 7, delay: 200, useNativeDriver: true }).start();
    }
  }, [step]);

  // Delivery stage auto-advance
  useEffect(() => {
    if (step !== "tracking") return;
    setDeliveryStage(0);
    const interval = setInterval(() => {
      setDeliveryStage(prev => {
        if (prev < DELIVERY_STAGES.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [step]);

  // ETA countdown (rough sim: -1 min each 6s)
  useEffect(() => {
    if (step !== "tracking") return;
    const interval = setInterval(() => {
      setEtaMinutes(m => Math.max(0, m - 1));
    }, 6000);
    return () => clearInterval(interval);
  }, [step]);

  const subtotal = getCartTotal();
  const fee      = deliveryType === "Delivery" ? DELIVERY_FEE : 0;
  const extraFee = PAYMENT_METHODS.find(m => m.id === paymentId)?.extraFee ?? 0;
  const total    = subtotal + fee + extraFee;

  function handleCheckout() {
    if (cartItems.length === 0) return;
    haptic("success");
    setTrackedItems([...cartItems]);
    setCurrentOrderId(orderId());
    clearCart();
    navigateTo("success");
    successScale.setValue(0);
    successCheckOpacity.setValue(0);
  }

  // ─── EMPTY CART ──────────────────────────────────────────────────────────
  if (cartItems.length === 0 && step === "cart") {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>My Cart</Text>
        </View>
        <View style={s.emptyWrap}>
          <View style={[s.emptyIconBg, { backgroundColor: colors.muted }]}>
            <Ionicons name="bag-handle-outline" size={52} color={colors.mutedForeground} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
          <Text style={[s.emptySub, { color: colors.mutedForeground }]}>
            Browse the marketplace and add items to get started.
          </Text>
          <Pressable
            style={[s.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/messages")}
          >
            <Ionicons name="storefront-outline" size={18} color="#fff" />
            <Text style={s.emptyBtnTxt}>Browse Marketplace</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── CART VIEW ────────────────────────────────────────────────────────────
  if (step === "cart") {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>My Cart</Text>
          <Pressable onPress={() => { haptic("medium"); clearCart(); }}>
            <Text style={[s.clearBtn, { color: colors.mutedForeground }]}>Clear All</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.listPad} showsVerticalScrollIndicator={false}>
          {cartItems.map((item) => (
            <View key={item.id} style={[s.cartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.cartImg}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={s.img} />
                ) : item.imageSource ? (
                  <Image source={item.imageSource} style={s.img} />
                ) : (
                  <View style={[s.imgPlaceholder, { backgroundColor: colors.muted }]}>
                    <Text style={{ fontSize: 28 }}>👟</Text>
                  </View>
                )}
                <View style={[s.sizeBadge, { backgroundColor: colors.primary }]}>
                  <Text style={s.sizeBadgeTxt}>Size {item.selectedSize}</Text>
                </View>
              </View>

              <View style={s.cartInfo}>
                <View style={s.cartTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cartBrand, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.brand} · {item.shopName}
                    </Text>
                    <Text style={[s.cartName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Pressable onPress={() => { haptic("medium"); removeFromCart(item.id); }} hitSlop={8}>
                    <View style={[s.trashBtn, { backgroundColor: "#FFF0F0" }]}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </View>
                  </Pressable>
                </View>

                <View style={s.cartBottom}>
                  <Text style={[s.cartPrice, { color: colors.foreground }]}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                  <View style={[s.qtyRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Pressable
                      style={s.qtyBtn}
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Ionicons name="remove" size={15} color={colors.foreground} />
                    </Pressable>
                    <Text style={[s.qtyNum, { color: colors.foreground }]}>{item.quantity}</Text>
                    <Pressable
                      style={s.qtyBtn}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={15} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Delivery type toggle in cart */}
          <View style={[s.deliveryToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.toggleLabel, { color: colors.foreground }]}>Delivery Method</Text>
            <View style={[s.segmented, { backgroundColor: colors.muted }]}>
              {(["Pickup", "Delivery"] as DeliveryType[]).map(dt => (
                <Pressable
                  key={dt}
                  style={[s.seg, deliveryType === dt && { backgroundColor: colors.primary }]}
                  onPress={() => { setDeliveryType(dt); haptic("light"); }}
                >
                  <Ionicons
                    name={dt === "Pickup" ? "walk-outline" : "bicycle-outline"}
                    size={14}
                    color={deliveryType === dt ? "#fff" : colors.mutedForeground}
                  />
                  <Text style={[s.segTxt, { color: deliveryType === dt ? "#fff" : colors.mutedForeground }]}>
                    {dt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Sticky checkout */}
        <View style={[s.sticky, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          <View style={s.stickyRow}>
            <View>
              <Text style={[s.stickyLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
              <Text style={[s.stickyVal, { color: colors.foreground }]}>${subtotal.toFixed(2)}</Text>
            </View>
            {deliveryType === "Delivery" && (
              <View style={[s.feePill, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="bicycle-outline" size={13} color={colors.primary} />
                <Text style={[s.feeTxt, { color: colors.primary }]}>+${DELIVERY_FEE.toFixed(2)} delivery</Text>
              </View>
            )}
          </View>
          <Pressable
            style={[s.checkoutBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigateTo("details")}
          >
            <Text style={s.checkoutBtnTxt}>Proceed to Checkout</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── DETAILS STEP ─────────────────────────────────────────────────────────
  if (step === "details") {
    return (
      <KeyboardAvoidingView
        style={[s.screen, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View style={[s.stepWrap, { paddingTop: topPad + 12, transform: [{ translateY: slideAnim }] }]}>
          <StepHeader
            title="Delivery Details" subtitle="Where should we send your order?"
            step={1} totalSteps={2}
            onBack={() => navigateTo("cart")} colors={colors}
          />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.stepScroll}>
            {/* Delivery type */}
            <Text style={[s.fieldLabel, { color: colors.foreground }]}>Delivery Method</Text>
            <View style={[s.segmented, { backgroundColor: colors.muted, marginBottom: 20 }]}>
              {(["Pickup", "Delivery"] as DeliveryType[]).map(dt => (
                <Pressable
                  key={dt}
                  style={[s.seg, deliveryType === dt && { backgroundColor: colors.primary }]}
                  onPress={() => { setDeliveryType(dt); haptic("light"); }}
                >
                  <Ionicons
                    name={dt === "Pickup" ? "walk-outline" : "bicycle-outline"}
                    size={14}
                    color={deliveryType === dt ? "#fff" : colors.mutedForeground}
                  />
                  <Text style={[s.segTxt, { color: deliveryType === dt ? "#fff" : colors.mutedForeground }]}>
                    {dt === "Pickup" ? "Store Pickup" : "Home Delivery"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {deliveryType === "Delivery" ? (
              <>
                <Text style={[s.fieldLabel, { color: colors.foreground }]}>Delivery Address</Text>
                <View style={[s.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { color: colors.foreground }]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter your address"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>

                <Text style={[s.fieldLabel, { color: colors.foreground }]}>Delivery Instructions</Text>
                <View style={[s.inputWrap, s.textAreaWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <TextInput
                    style={[s.input, s.textArea, { color: colors.foreground }]}
                    value={instructions}
                    onChangeText={setInstructions}
                    placeholder="E.g. Gate code, landmarks, call when nearby..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Fee info */}
                <View style={[s.infoCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <Text style={[s.infoTxt, { color: colors.primary }]}>
                    Delivery fee: <Text style={{ fontFamily: "Inter_700Bold" }}>${DELIVERY_FEE.toFixed(2)}</Text> · Est. 15–25 min
                  </Text>
                </View>
              </>
            ) : (
              <View style={[s.pickupCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={[s.pickupIcon, { backgroundColor: colors.primary + "20" }]}>
                  <Ionicons name="storefront-outline" size={28} color={colors.primary} />
                </View>
                <Text style={[s.pickupTitle, { color: colors.foreground }]}>Old Town Market</Text>
                <Text style={[s.pickupAddr, { color: colors.mutedForeground }]}>
                  Lilongwe Old Town, Market Circle{"\n"}Open: Mon–Sat, 7am–7pm
                </Text>
                <View style={[s.pickupBadge, { backgroundColor: "#22C55E20" }]}>
                  <View style={[s.pickupDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={[s.pickupBadgeTxt, { color: "#22C55E" }]}>Ready for pickup in ~10 min</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        <View style={[s.stepFooter, { borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={[s.checkoutBtn, { backgroundColor: colors.primary }]} onPress={() => navigateTo("payment")}>
            <Text style={s.checkoutBtnTxt}>Continue to Payment</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── PAYMENT STEP ─────────────────────────────────────────────────────────
  if (step === "payment") {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <Animated.View style={[s.stepWrap, { paddingTop: topPad + 12, flex: 1, transform: [{ translateY: slideAnim }] }]}>
          <StepHeader
            title="Payment" subtitle="Secure & fast checkout"
            step={2} totalSteps={2}
            onBack={() => navigateTo("details")} colors={colors}
          />
          <PaymentStep
            selected={paymentId}
            onSelect={id => { setPaymentId(id); haptic("light"); }}
            colors={colors}
            total={subtotal}
            deliveryFee={fee}
          />
        </Animated.View>

        <View style={[s.stepFooter, { borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={[
              s.checkoutBtn,
              { backgroundColor: paymentId ? colors.primary : colors.muted },
            ]}
            disabled={!paymentId}
            onPress={handleCheckout}
          >
            <Ionicons name="lock-closed" size={16} color={paymentId ? "#fff" : colors.mutedForeground} />
            <Text style={[s.checkoutBtnTxt, { color: paymentId ? "#fff" : colors.mutedForeground }]}>
              Confirm & Pay ${total.toFixed(2)}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── SUCCESS SCREEN ───────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <View style={[s.screen, s.successScreen, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Animated.View style={[s.successCircle, { transform: [{ scale: successScale }] }]}>
          <LinearGradient colors={["#4A80F0", "#7C5CFC"]} style={s.successGrad}>
            <Animated.View style={{ opacity: successCheckOpacity }}>
              <Ionicons name="checkmark" size={60} color="#fff" />
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[{ opacity: successCheckOpacity, alignItems: "center" }]}>
          <Text style={[s.successTitle, { color: colors.foreground }]}>Order Confirmed!</Text>
          <Text style={[s.successSub, { color: colors.mutedForeground }]}>
            Your order has been placed and payment is being processed.
          </Text>

          <View style={[s.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.successRow}>
              <Text style={[s.successRowLabel, { color: colors.mutedForeground }]}>Order ID</Text>
              <Text style={[s.successRowVal, { color: colors.primary }]}>{currentOrderId}</Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.successRow}>
              <Text style={[s.successRowLabel, { color: colors.mutedForeground }]}>Items</Text>
              <Text style={[s.successRowVal, { color: colors.foreground }]}>
                {trackedItems.reduce((s, i) => s + i.quantity, 0)} item{trackedItems.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.successRow}>
              <Text style={[s.successRowLabel, { color: colors.mutedForeground }]}>Payment</Text>
              <Text style={[s.successRowVal, { color: colors.foreground }]}>
                {PAYMENT_METHODS.find(m => m.id === paymentId)?.name ?? "—"}
              </Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.successRow}>
              <Text style={[s.successRowLabel, { color: colors.mutedForeground }]}>Total Paid</Text>
              <Text style={[s.successRowVal, { color: colors.foreground, fontFamily: "Inter_800ExtraBold" }]}>
                ${total.toFixed(2)}
              </Text>
            </View>
          </View>

          <Text style={[s.successHint, { color: colors.mutedForeground }]}>
            Taking you to live tracking...
          </Text>
        </Animated.View>
      </View>
    );
  }

  // ─── TRACKING SCREEN ──────────────────────────────────────────────────────
  const currentStage = DELIVERY_STAGES[deliveryStage];
  const panelTranslate = panelSlide.interpolate({ inputRange: [0, 1], outputRange: [340, 0] });
  const isDelivered = deliveryStage >= 8;

  return (
    <View style={s.screen}>
      {/* Full-screen map */}
      <Map colors={colors} isDark={isDark} />

      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
        <Pressable
          style={[s.topBackBtn, { backgroundColor: colors.card + "EE", borderColor: colors.border }]}
          onPress={() => {
            setStep("cart");
            panelSlide.setValue(0);
          }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>

        <View style={[s.orderIdPill, { backgroundColor: colors.card + "EE" }]}>
          {!isDelivered && <View style={[s.liveDot, { backgroundColor: "#EF4444" }]} />}
          <Text style={[s.orderIdTxt, { color: colors.foreground }]}>
            {isDelivered ? "✓ Delivered" : currentOrderId}
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* Driver contact FAB */}
      <View style={s.driverFab}>
        <Pressable
          style={[s.fabBtn, { backgroundColor: colors.primary }]}
          onPress={() => haptic("medium")}
        >
          <Ionicons name="call-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Bottom panel */}
      <Animated.View
        style={[
          s.panel,
          { backgroundColor: colors.card, transform: [{ translateY: panelTranslate }] },
        ]}
      >
        {/* Handle */}
        <View style={s.panelHandle}>
          <View style={[s.handleBar, { backgroundColor: colors.border }]} />
        </View>

        {/* Driver info row */}
        <View style={s.driverRow}>
          <View style={[s.driverAvatar, { backgroundColor: colors.primary }]}>
            <Text style={s.driverInitials}>{driver.initials}</Text>
          </View>
          <View style={s.driverInfo}>
            <Text style={[s.driverName, { color: colors.foreground }]}>{driver.name}</Text>
            <View style={s.driverMeta}>
              <Ionicons name="star" size={13} color="#FFB300" />
              <Text style={[s.driverRating, { color: colors.mutedForeground }]}>{driver.rating}</Text>
              <Text style={[s.driverDot, { color: colors.mutedForeground }]}>·</Text>
              <Text style={[s.driverVehicle, { color: colors.mutedForeground }]}>Motorcycle</Text>
            </View>
          </View>
          <View style={[s.etaBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[s.etaNum, { color: colors.primary }]}>
              {isDelivered ? "0" : etaMinutes}
            </Text>
            <Text style={[s.etaUnit, { color: colors.primary }]}>min</Text>
          </View>
        </View>

        {/* Current stage banner */}
        <View style={[s.stageBanner, { backgroundColor: isDelivered ? "#22C55E18" : colors.primary + "12", borderColor: isDelivered ? "#22C55E30" : colors.primary + "30" }]}>
          <Ionicons
            name={currentStage.icon}
            size={16}
            color={isDelivered ? "#22C55E" : colors.primary}
          />
          <Text style={[s.stageTxt, { color: isDelivered ? "#22C55E" : colors.primary }]}>
            {currentStage.label}
          </Text>
          <View style={[s.stageProgress, { backgroundColor: isDelivered ? "#22C55E20" : colors.primary + "20" }]}>
            <Text style={[s.stagePct, { color: isDelivered ? "#22C55E" : colors.primary }]}>
              {Math.round((deliveryStage / (DELIVERY_STAGES.length - 1)) * 100)}%
            </Text>
          </View>
        </View>

        {/* Compact timeline */}
        <ScrollView
          style={s.timelineScroll}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          <DeliveryTimeline currentStage={deliveryStage} colors={colors} compact />
        </ScrollView>

        {/* Tracked items */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.itemsScroll}
        >
          {trackedItems.map(item => (
            <View key={item.id} style={[s.trackCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[s.trackImgWrap, { backgroundColor: colors.muted }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={s.trackImg} />
                ) : item.imageSource ? (
                  <Image source={item.imageSource} style={s.trackImg} />
                ) : (
                  <Text style={{ fontSize: 20 }}>👟</Text>
                )}
              </View>
              <Text style={[s.trackName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[s.trackMeta, { color: colors.mutedForeground }]}>Qty {item.quantity} · Sz {item.selectedSize}</Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1 },
  // ── Header ──
  header: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:20, paddingVertical:14 },
  headerTitle: { fontSize:26, fontFamily:"Inter_800ExtraBold" },
  clearBtn: { fontSize:14, fontFamily:"Inter_600SemiBold" },
  // ── Empty ──
  emptyWrap: { flex:1, alignItems:"center", justifyContent:"center", paddingHorizontal:40, paddingBottom:80 },
  emptyIconBg: { width:100, height:100, borderRadius:28, alignItems:"center", justifyContent:"center", marginBottom:20 },
  emptyTitle: { fontSize:20, fontFamily:"Inter_700Bold", marginBottom:8 },
  emptySub: { fontSize:14, fontFamily:"Inter_400Regular", textAlign:"center", lineHeight:20, marginBottom:24 },
  emptyBtn: { flexDirection:"row", alignItems:"center", gap:8, paddingVertical:14, paddingHorizontal:24, borderRadius:16 },
  emptyBtnTxt: { color:"#fff", fontSize:15, fontFamily:"Inter_700Bold" },
  // ── Cart ──
  listPad: { paddingHorizontal:16, paddingTop:4, paddingBottom:180, gap:14 },
  cartCard: { borderRadius:20, borderWidth:1, overflow:"hidden" },
  cartImg: { height:140, position:"relative" },
  img: { width:"100%", height:"100%", resizeMode:"cover" },
  imgPlaceholder: { flex:1, alignItems:"center", justifyContent:"center" },
  sizeBadge: { position:"absolute", bottom:10, right:10, paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
  sizeBadgeTxt: { color:"#fff", fontSize:11, fontFamily:"Inter_700Bold" },
  cartInfo: { padding:14 },
  cartTitleRow: { flexDirection:"row", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 },
  cartBrand: { fontSize:11, fontFamily:"Inter_600SemiBold", marginBottom:2, letterSpacing:0.3 },
  cartName: { fontSize:17, fontFamily:"Inter_800ExtraBold" },
  trashBtn: { width:32, height:32, borderRadius:10, alignItems:"center", justifyContent:"center" },
  cartBottom: { flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  cartPrice: { fontSize:18, fontFamily:"Inter_800ExtraBold" },
  qtyRow: { flexDirection:"row", alignItems:"center", borderRadius:12, borderWidth:1, overflow:"hidden" },
  qtyBtn: { paddingHorizontal:12, paddingVertical:8 },
  qtyNum: { fontSize:14, fontFamily:"Inter_700Bold", paddingHorizontal:8 },
  // ── Delivery toggle ──
  deliveryToggle: { borderRadius:16, borderWidth:1, padding:16 },
  toggleLabel: { fontSize:13, fontFamily:"Inter_600SemiBold", marginBottom:10 },
  segmented: { flexDirection:"row", borderRadius:14, padding:4, gap:4 },
  seg: { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, paddingVertical:10, borderRadius:10 },
  segTxt: { fontSize:13, fontFamily:"Inter_600SemiBold" },
  // ── Sticky bottom ──
  sticky: { position:"absolute", bottom:0, left:0, right:0, borderTopWidth:1, paddingHorizontal:20, paddingTop:14, gap:10 },
  stickyRow: { flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  stickyLabel: { fontSize:13, fontFamily:"Inter_400Regular" },
  stickyVal: { fontSize:22, fontFamily:"Inter_800ExtraBold" },
  feePill: { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:10, paddingVertical:5, borderRadius:20 },
  feeTxt: { fontSize:12, fontFamily:"Inter_600SemiBold" },
  checkoutBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:16, borderRadius:16 },
  checkoutBtnTxt: { color:"#fff", fontSize:16, fontFamily:"Inter_700Bold" },
  // ── Step layout ──
  stepWrap: { flex:1, paddingHorizontal:20 },
  stepScroll: { paddingBottom:24 },
  stepFooter: { paddingHorizontal:20, paddingTop:14, borderTopWidth:1 },
  // ── Details step ──
  fieldLabel: { fontSize:13, fontFamily:"Inter_700Bold", marginBottom:8, marginTop:4 },
  inputWrap: { flexDirection:"row", alignItems:"center", borderRadius:14, borderWidth:1, paddingHorizontal:14, marginBottom:16 },
  inputIcon: { marginRight:8 },
  input: { flex:1, fontSize:14, fontFamily:"Inter_400Regular", paddingVertical:14 },
  textAreaWrap: { alignItems:"flex-start", paddingTop:14 },
  textArea: { height:80, textAlignVertical:"top" },
  infoCard: { flexDirection:"row", alignItems:"center", gap:8, borderRadius:12, borderWidth:1, padding:14 },
  infoTxt: { fontSize:13, fontFamily:"Inter_500Medium", flex:1, lineHeight:18 },
  pickupCard: { borderRadius:20, borderWidth:1, padding:20, alignItems:"center", gap:10 },
  pickupIcon: { width:60, height:60, borderRadius:18, alignItems:"center", justifyContent:"center" },
  pickupTitle: { fontSize:18, fontFamily:"Inter_800ExtraBold" },
  pickupAddr: { fontSize:14, fontFamily:"Inter_400Regular", textAlign:"center", lineHeight:20 },
  pickupBadge: { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:12, paddingVertical:6, borderRadius:20 },
  pickupDot: { width:7, height:7, borderRadius:4 },
  pickupBadgeTxt: { fontSize:12, fontFamily:"Inter_600SemiBold" },
  // ── Success ──
  successScreen: { alignItems:"center", justifyContent:"center", gap:24, paddingHorizontal:32 },
  successCircle: { width:120, height:120, borderRadius:60, overflow:"hidden" },
  successGrad: { flex:1, alignItems:"center", justifyContent:"center" },
  successTitle: { fontSize:26, fontFamily:"Inter_800ExtraBold", textAlign:"center" },
  successSub: { fontSize:14, fontFamily:"Inter_400Regular", textAlign:"center", lineHeight:20 },
  successCard: { width:"100%", borderRadius:20, borderWidth:1, padding:18, gap:0 },
  successRow: { flexDirection:"row", justifyContent:"space-between", paddingVertical:12 },
  successRowLabel: { fontSize:13, fontFamily:"Inter_400Regular" },
  successRowVal: { fontSize:13, fontFamily:"Inter_600SemiBold" },
  divider: { height:1 },
  successHint: { fontSize:13, fontFamily:"Inter_400Regular", marginTop:-8 },
  // ── Tracking ──
  topBar: {
    position:"absolute", top:0, left:0, right:0,
    flexDirection:"row", alignItems:"center", justifyContent:"space-between",
    paddingHorizontal:16, paddingBottom:12, zIndex:20,
  },
  topBackBtn: {
    width:44, height:44, borderRadius:13, borderWidth:1,
    alignItems:"center", justifyContent:"center",
    shadowColor:"#000", shadowOpacity:0.12, shadowRadius:8, shadowOffset:{width:0,height:3}, elevation:5,
  },
  orderIdPill: {
    flexDirection:"row", alignItems:"center", gap:7,
    paddingHorizontal:16, paddingVertical:10, borderRadius:20,
    shadowColor:"#000", shadowOpacity:0.1, shadowRadius:6, shadowOffset:{width:0,height:2}, elevation:4,
  },
  liveDot: { width:7, height:7, borderRadius:4 },
  orderIdTxt: { fontSize:13, fontFamily:"Inter_700Bold" },
  driverFab: { position:"absolute", right:16, bottom:360, zIndex:20 },
  fabBtn: {
    width:50, height:50, borderRadius:16, alignItems:"center", justifyContent:"center",
    shadowColor:"#4A80F0", shadowOpacity:0.4, shadowRadius:10, shadowOffset:{width:0,height:4}, elevation:8,
  },
  // ── Panel ──
  panel: {
    position:"absolute", bottom:0, left:0, right:0,
    borderTopLeftRadius:28, borderTopRightRadius:28,
    paddingBottom:20,
    shadowColor:"#000", shadowOpacity:0.2, shadowRadius:20, shadowOffset:{width:0,height:-4}, elevation:20,
  },
  panelHandle: { alignItems:"center", paddingVertical:12 },
  handleBar: { width:36, height:4, borderRadius:2 },
  driverRow: { flexDirection:"row", alignItems:"center", paddingHorizontal:20, marginBottom:14, gap:14 },
  driverAvatar: { width:48, height:48, borderRadius:16, alignItems:"center", justifyContent:"center" },
  driverInitials: { color:"#fff", fontSize:16, fontFamily:"Inter_800ExtraBold" },
  driverInfo: { flex:1 },
  driverName: { fontSize:15, fontFamily:"Inter_700Bold", marginBottom:3 },
  driverMeta: { flexDirection:"row", alignItems:"center", gap:4 },
  driverRating: { fontSize:13, fontFamily:"Inter_500Medium" },
  driverDot: { fontSize:13 },
  driverVehicle: { fontSize:13, fontFamily:"Inter_400Regular" },
  etaBadge: { alignItems:"center", paddingHorizontal:14, paddingVertical:8, borderRadius:14 },
  etaNum: { fontSize:22, fontFamily:"Inter_800ExtraBold", lineHeight:26 },
  etaUnit: { fontSize:11, fontFamily:"Inter_500Medium" },
  stageBanner: {
    flexDirection:"row", alignItems:"center", gap:8,
    marginHorizontal:20, marginBottom:12,
    paddingHorizontal:14, paddingVertical:10, borderRadius:14, borderWidth:1,
  },
  stageTxt: { fontSize:13, fontFamily:"Inter_700Bold", flex:1 },
  stageProgress: { paddingHorizontal:8, paddingVertical:3, borderRadius:8 },
  stagePct: { fontSize:11, fontFamily:"Inter_700Bold" },
  timelineScroll: { paddingHorizontal:20, maxHeight:130 },
  itemsScroll: { paddingHorizontal:16, paddingTop:12, gap:12, paddingBottom:4 },
  trackCard: { width:120, borderRadius:14, borderWidth:1, overflow:"hidden", padding:10, gap:6 },
  trackImgWrap: { width:"100%", height:70, borderRadius:10, alignItems:"center", justifyContent:"center", overflow:"hidden" },
  trackImg: { width:"100%", height:"100%", resizeMode:"cover" },
  trackName: { fontSize:12, fontFamily:"Inter_700Bold", lineHeight:16 },
  trackMeta: { fontSize:11, fontFamily:"Inter_400Regular" },
});
