import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  Image,
  TextInput,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { useOrder, calcStage } from "@/context/OrderContext";
import { useTracking } from "@/hooks/useTracking";
import Map from "@/components/Map";
import DeliveryTimeline, {
  DELIVERY_STAGES,
} from "@/components/checkout/DeliveryTimeline";
import PaymentStep, {
  PAYMENT_METHODS,
} from "@/components/checkout/PaymentStep";
import LocationPickerModal, {
  MZUZU_LOCATIONS,
} from "@/components/checkout/LocationPickerModal";
import {
  STORE_COORD,
  fetchRoute,
  calculateRouteDistanceKm,
} from "@/lib/routing";

const { width } = Dimensions.get("window");
const TAB_BAR_H = Platform.OS === "web" ? 84 : 70;
const DELIVERY_FEE = 1.5;

type CheckoutStep = "cart" | "details" | "payment" | "success" | "tracking";
type DeliveryType = "Pickup" | "Delivery";
type MainView = "shop" | "history";

const MOCK_DRIVERS = [
  { name: "Chisomo Banda", rating: 4.9, initials: "CB" },
  { name: "Tiwonge Phiri", rating: 4.8, initials: "TP" },
  { name: "Limbani Mwale", rating: 4.7, initials: "LM" },
];

function orderId() {
  return `DRP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Step header ──────────────────────────────────────────────────────────────
function StepHeader({
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
  colors,
}: {
  title: string;
  subtitle: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
  colors: any;
}) {
  return (
    <View style={sh.wrap}>
      <Pressable
        onPress={onBack}
        style={[sh.back, { backgroundColor: colors.muted }]}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={20} color={colors.foreground} />
      </Pressable>
      <View style={sh.titles}>
        <Text style={[sh.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[sh.sub, { color: colors.mutedForeground }]}>
          {subtitle}
        </Text>
      </View>
      <View style={[sh.badge, { backgroundColor: colors.primary + "18" }]}>
        <Text style={[sh.badgeTxt, { color: colors.primary }]}>
          {step}/{totalSteps}
        </Text>
      </View>
    </View>
  );
}
const sh = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 20,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titles: { flex: 1 },
  title: { fontSize: 18, fontFamily: "Inter_800ExtraBold", lineHeight: 22 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const footerBottom = insets.bottom + TAB_BAR_H + 16;
  const isDark = colors.background === "#121212";
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } =
    useCart();
  const { activeOrder, orderHistory, placeOrder, completeOrder } = useOrder();

  // ── View / step state ──
  const [mainView, setMainView] = useState<MainView>("shop");
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("Delivery");
  const [address, setAddress] = useState("Chimaliro, Mzuzu, Malawi");
  const [vehicleType, setVehicleType] = useState<"bike" | "car">("bike");
  const [routeDistanceKm, setRouteDistanceKm] = useState(0);
  const [instructions, setInstructions] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [snapshotItems, setSnapshotItems] = useState<typeof cartItems>([]);
  const [driver] = useState(
    MOCK_DRIVERS[Math.floor(Math.random() * MOCK_DRIVERS.length)],
  );

  const { route, liveStage, liveEta, destination } = useTracking();

  // ── Animations ──
  const slideAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const panelSlide = useRef(new Animated.Value(0)).current;
  const bannerPulse = useRef(new Animated.Value(1)).current;
  const historySlide = useRef(new Animated.Value(40)).current;

  const haptic = useCallback((s: "light" | "medium" | "success") => {
    if (Platform.OS === "web") return;
    if (s === "success")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (s === "medium")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const navigateTo = useCallback(
    (next: CheckoutStep) => {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 18,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setStep(next);
      haptic("light");
    },
    [slideAnim, haptic],
  );

  // Banner pulse for active order indicator
  useEffect(() => {
    if (!activeOrder) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bannerPulse, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(bannerPulse, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [activeOrder]);

  // Distance calculator to restrict bike delivery
  useEffect(() => {
    const match = MZUZU_LOCATIONS.find(
      (l) => address.includes(l.name) || l.detail === address,
    );
    if (match) {
      fetchRoute(STORE_COORD, { latitude: match.lat, longitude: match.lng })
        .then((route) => {
          const dist = calculateRouteDistanceKm(route);
          setRouteDistanceKm(dist);
          if (dist > 10 && vehicleType === "bike") {
            setVehicleType("car");
          }
        })
        .catch(() => {});
    }
  }, [address]);

  // Success animation
  useEffect(() => {
    if (step !== "success") return;
    Animated.sequence([
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
    const t = setTimeout(() => {
      setStep("tracking");
      Animated.spring(panelSlide, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 2800);
    return () => clearTimeout(t);
  }, [step]);

  // Panel slide when tracking starts
  useEffect(() => {
    if (step === "tracking") {
      Animated.spring(panelSlide, {
        toValue: 1,
        friction: 7,
        delay: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [step]);

  // History view slide-in animation
  useEffect(() => {
    if (mainView === "history") {
      Animated.spring(historySlide, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      historySlide.setValue(40);
    }
  }, [mainView]);

  // If active order just completed while tracking → go back to cart view
  useEffect(() => {
    if (!activeOrder && step === "tracking") {
      setStep("cart");
      panelSlide.setValue(0);
    }
  }, [activeOrder]);

  const subtotal = getCartTotal();
  const fee = deliveryType === "Delivery" ? DELIVERY_FEE : 0;
  const extraFee =
    PAYMENT_METHODS.find((m) => m.id === paymentId)?.extraFee ?? 0;
  const total = subtotal + fee + extraFee;

  function handleCheckout() {
    if (cartItems.length === 0) return;
    haptic("success");
    const id = orderId();
    const items = cartItems.map((ci) => ({
      id: ci.id,
      name: ci.name,
      brand: ci.brand,
      price: ci.price,
      quantity: ci.quantity,
      selectedSize: ci.selectedSize,
      imageUrl: ci.imageUrl,
      imageSource: ci.imageSource,
      shopName: ci.shopName,
    }));
    setSnapshotItems([...cartItems]);
    setCurrentOrderId(id);
    // Persist order in context (survives navigation)
    placeOrder({
      orderId: id,
      items,
      paymentId: paymentId!,
      paymentName: PAYMENT_METHODS.find((m) => m.id === paymentId)?.name ?? "",
      deliveryType,
      address: deliveryType === "Delivery" ? address : "Shoprite Mzuzu",
      vehicleType,
      driverName: driver.name,
      driverInitials: driver.initials,
      driverRating: driver.rating,
      subtotal,
      deliveryFee: fee,
      total: total,
    });
    clearCart();
    successScale.setValue(0);
    successOpacity.setValue(0);
    navigateTo("success");
  }

  // Resume tracking an active order (from banner or history)
  function resumeTracking() {
    if (!activeOrder) return;
    setCurrentOrderId(activeOrder.orderId);
    setSnapshotItems(activeOrder.items as any);
    panelSlide.setValue(0);
    setStep("tracking");
    haptic("medium");
    Animated.spring(panelSlide, {
      toValue: 1,
      friction: 7,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }

  // ─── HISTORY VIEW ─────────────────────────────────────────────────────────
  if (mainView === "history") {
    const allOrders = [
      ...(activeOrder
        ? [
            {
              orderId: activeOrder.orderId,
              items: activeOrder.items,
              paymentName: activeOrder.paymentName,
              total: activeOrder.total,
              placedAt: activeOrder.placedAt,
              completedAt: undefined as number | undefined,
              finalStage: calcStage(activeOrder.placedAt),
              isActive: true,
            },
          ]
        : []),
      ...orderHistory.map((h) => ({
        orderId: h.orderId,
        items: h.items,
        paymentName: h.paymentName,
        total: h.total,
        placedAt: h.placedAt,
        completedAt: h.completedAt,
        finalStage: h.finalStage,
        isActive: false,
      })),
    ];

    return (
      <View
        style={[
          s.screen,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable
            onPress={() => setMainView("shop")}
            style={[s.historyBackBtn, { backgroundColor: colors.muted }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>
            My Orders
          </Text>
          <View style={{ width: 38 }} />
        </View>

        {allOrders.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIconBg, { backgroundColor: colors.muted }]}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={colors.mutedForeground}
              />
            </View>
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>
              No orders yet
            </Text>
            <Text style={[s.emptySub, { color: colors.mutedForeground }]}>
              Your order history will appear here once you make a purchase.
            </Text>
            <Pressable
              style={[s.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setMainView("shop")}
            >
              <Ionicons name="storefront-outline" size={18} color="#fff" />
              <Text style={s.emptyBtnTxt}>Browse Marketplace</Text>
            </Pressable>
          </View>
        ) : (
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.historyList}
            style={{ transform: [{ translateY: historySlide }] }}
          >
            {allOrders.map((order) => {
              const isDelivered =
                order.finalStage >= DELIVERY_STAGES.length - 1;
              const statusLabel = order.isActive
                ? (DELIVERY_STAGES[order.finalStage]?.label ?? "In Transit")
                : isDelivered
                  ? "Delivered"
                  : "Incomplete";
              const statusColor = order.isActive
                ? colors.primary
                : isDelivered
                  ? "#22C55E"
                  : colors.mutedForeground;
              const statusBg = order.isActive
                ? colors.primary + "15"
                : isDelivered
                  ? "#22C55E18"
                  : colors.muted;

              return (
                <Pressable
                  key={order.orderId}
                  style={[
                    s.historyCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    if (order.isActive) resumeTracking();
                  }}
                >
                  {/* Top row */}
                  <View style={s.historyTop}>
                    <View style={s.historyLeft}>
                      <View
                        style={[s.historyDot, { backgroundColor: statusColor }]}
                      />
                      <Text
                        style={[s.historyOrderId, { color: colors.foreground }]}
                      >
                        {order.orderId}
                      </Text>
                    </View>
                    <Text
                      style={[s.historyTotal, { color: colors.foreground }]}
                    >
                      MWK {order.total.toFixed(2)}
                    </Text>
                  </View>

                  {/* Status badge + date */}
                  <View style={s.historyMeta}>
                    <View
                      style={[
                        s.historyStatusBadge,
                        { backgroundColor: statusBg },
                      ]}
                    >
                      {order.isActive && (
                        <View
                          style={[
                            s.liveDotSmall,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                      <Text
                        style={[s.historyStatusTxt, { color: statusColor }]}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                    <Text
                      style={[s.historyDate, { color: colors.mutedForeground }]}
                    >
                      {formatDate(order.placedAt)} ·{" "}
                      {formatTime(order.placedAt)}
                    </Text>
                  </View>

                  {/* Items preview */}
                  <View style={s.historyItems}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {order.items.slice(0, 4).map((item) => (
                        <View
                          key={item.id}
                          style={[
                            s.historyThumb,
                            { backgroundColor: colors.muted },
                          ]}
                        >
                          {item.imageUrl ? (
                            <Image
                              source={{ uri: item.imageUrl }}
                              style={s.historyThumbImg}
                            />
                          ) : item.imageSource ? (
                            <Image
                              source={item.imageSource}
                              style={s.historyThumbImg}
                            />
                          ) : (
                            <Ionicons name="cube-outline" size={18} color={colors.mutedForeground} />
                          )}
                        </View>
                      ))}
                      {order.items.length > 4 && (
                        <View
                          style={[
                            s.historyThumb,
                            s.historyMore,
                            { backgroundColor: colors.primary + "20" },
                          ]}
                        >
                          <Text
                            style={[
                              s.historyMoreTxt,
                              { color: colors.primary },
                            ]}
                          >
                            +{order.items.length - 4}
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>

                  {/* Footer */}
                  <View
                    style={[s.historyFooter, { borderTopColor: colors.border }]}
                  >
                    <View style={s.historyFooterLeft}>
                      <Ionicons
                        name="card-outline"
                        size={13}
                        color={colors.mutedForeground}
                      />
                      <Text
                        style={[
                          s.historyPayment,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {order.paymentName}
                      </Text>
                      <Text
                        style={[s.historyPayment, { color: colors.border }]}
                      >
                        ·
                      </Text>
                      <Text
                        style={[
                          s.historyPayment,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {order.items.reduce((s, i) => s + i.quantity, 0)} item
                        {order.items.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    {order.isActive && (
                      <View
                        style={[
                          s.trackCta,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={s.trackCtaTxt}>Track →</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </Animated.ScrollView>
        )}
      </View>
    );
  }

  // ─── EMPTY CART ──────────────────────────────────────────────────────────
  if (cartItems.length === 0 && step === "cart") {
    return (
      <View
        style={[
          s.screen,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>
            My Cart
          </Text>
          <Pressable
            onPress={() => {
              setMainView("history");
              haptic("light");
            }}
            style={[s.historyTabBtn, { backgroundColor: colors.muted }]}
          >
            <Ionicons
              name="receipt-outline"
              size={16}
              color={colors.foreground}
            />
            <Text style={[s.historyTabTxt, { color: colors.foreground }]}>
              Orders
            </Text>
            {(orderHistory.length > 0 || activeOrder) && (
              <View
                style={[s.ordersBadge, { backgroundColor: colors.primary }]}
              >
                <Text style={s.ordersBadgeNum}>
                  {orderHistory.length + (activeOrder ? 1 : 0)}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Active order resume banner */}
        {activeOrder && (
          <ActiveOrderBanner
            order={activeOrder}
            liveStage={liveStage}
            liveEta={liveEta}
            colors={colors}
            pulseAnim={bannerPulse}
            onPress={resumeTracking}
          />
        )}

        <View style={s.emptyWrap}>
          <View style={[s.emptyIconBg, { backgroundColor: colors.muted }]}>
            <Ionicons
              name="bag-handle-outline"
              size={52}
              color={colors.mutedForeground}
            />
          </View>
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>
            Your cart is empty
          </Text>
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
      <View
        style={[
          s.screen,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>
            My Cart
          </Text>
          <View style={s.headerRight}>
            <Pressable
              onPress={() => {
                setMainView("history");
                haptic("light");
              }}
              style={[s.historyTabBtn, { backgroundColor: colors.muted }]}
            >
              <Ionicons
                name="receipt-outline"
                size={16}
                color={colors.foreground}
              />
              <Text style={[s.historyTabTxt, { color: colors.foreground }]}>
                Orders
              </Text>
              {(orderHistory.length > 0 || activeOrder) && (
                <View
                  style={[s.ordersBadge, { backgroundColor: colors.primary }]}
                >
                  <Text style={s.ordersBadgeNum}>
                    {orderHistory.length + (activeOrder ? 1 : 0)}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                haptic("medium");
                clearCart();
              }}
            >
              <Text style={[s.clearBtn, { color: colors.mutedForeground }]}>
                Clear
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Active order resume banner */}
        {activeOrder && (
          <ActiveOrderBanner
            order={activeOrder}
            liveStage={liveStage}
            liveEta={liveEta}
            colors={colors}
            pulseAnim={bannerPulse}
            onPress={resumeTracking}
          />
        )}

        <ScrollView
          contentContainerStyle={s.listPad}
          showsVerticalScrollIndicator={false}
        >
          {cartItems.map((item) => (
            <View
              key={item.id}
              style={[
                s.cartCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={s.cartImg}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={s.img} />
                ) : item.imageSource ? (
                  <Image source={item.imageSource} style={s.img} />
                ) : (
                  <View
                    style={[
                      s.imgPlaceholder,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Ionicons name="cube-outline" size={28} color={colors.mutedForeground} />
                  </View>
                )}
                {item.selectedSize > 0 && (
                  <View
                    style={[s.sizeBadge, { backgroundColor: colors.primary }]}
                  >
                    <Text style={s.sizeBadgeTxt}>Size {item.selectedSize}</Text>
                  </View>
                )}
              </View>
              <View style={s.cartInfo}>
                <View style={s.cartTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[s.cartBrand, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {item.brand} · {item.shopName}
                    </Text>
                    <Text
                      style={[s.cartName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      haptic("medium");
                      removeFromCart(item.id);
                    }}
                    hitSlop={8}
                  >
                    <View style={[s.trashBtn, { backgroundColor: "#FFF0F0" }]}>
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#EF4444"
                      />
                    </View>
                  </Pressable>
                </View>
                <View style={s.cartBottom}>
                  <Text style={[s.cartPrice, { color: colors.foreground }]}>
                    MWK {(item.price * item.quantity).toFixed(2)}
                  </Text>
                  <View style={[s.qtyRow, { backgroundColor: colors.muted }]}>
                    <Pressable
                      style={s.qtyBtn}
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Ionicons
                        name="remove"
                        size={15}
                        color={colors.foreground}
                      />
                    </Pressable>
                    <Text style={[s.qtyNum, { color: colors.foreground }]}>
                      {item.quantity}
                    </Text>
                    <Pressable
                      style={s.qtyBtn}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Ionicons
                        name="add"
                        size={15}
                        color={colors.foreground}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Delivery toggle */}
          <View
            style={[
              s.deliveryToggle,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[s.toggleLabel, { color: colors.foreground }]}>
              Delivery Method
            </Text>
            <View style={[s.segmented, { backgroundColor: colors.muted }]}>
              {(["Pickup", "Delivery"] as DeliveryType[]).map((dt) => (
                <Pressable
                  key={dt}
                  style={[
                    s.seg,
                    deliveryType === dt && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    setDeliveryType(dt);
                    haptic("light");
                  }}
                >
                  <Ionicons
                    name={dt === "Pickup" ? "walk-outline" : "bicycle-outline"}
                    size={14}
                    color={
                      deliveryType === dt ? "#fff" : colors.mutedForeground
                    }
                  />
                  <Text
                    style={[
                      s.segTxt,
                      {
                        color:
                          deliveryType === dt ? "#fff" : colors.mutedForeground,
                      },
                    ]}
                  >
                    {dt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            s.sticky,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={s.stickyRow}>
            <View>
              <Text style={[s.stickyLabel, { color: colors.mutedForeground }]}>
                Subtotal
              </Text>
              <Text style={[s.stickyVal, { color: colors.foreground }]}>
                MWK {subtotal.toFixed(2)}
              </Text>
            </View>
            {deliveryType === "Delivery" && (
              <View
                style={[s.feePill, { backgroundColor: colors.primary + "15" }]}
              >
                <Ionicons
                  name="bicycle-outline"
                  size={13}
                  color={colors.primary}
                />
                <Text style={[s.feeTxt, { color: colors.primary }]}>
                  +MWK {DELIVERY_FEE.toFixed(2)} delivery
                </Text>
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
        <Animated.View
          style={[
            s.stepWrap,
            { paddingTop: topPad + 12, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <StepHeader
            title="Delivery Details"
            subtitle="Where should we send your order?"
            step={1}
            totalSteps={2}
            onBack={() => navigateTo("cart")}
            colors={colors}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.stepScroll}
          >
            <Text style={[s.fieldLabel, { color: colors.foreground }]}>
              Delivery Method
            </Text>
            <View
              style={[
                s.segmented,
                { backgroundColor: colors.muted, marginBottom: 20 },
              ]}
            >
              {(["Pickup", "Delivery"] as DeliveryType[]).map((dt) => (
                <Pressable
                  key={dt}
                  style={[
                    s.seg,
                    deliveryType === dt && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    setDeliveryType(dt);
                    haptic("light");
                  }}
                >
                  <Ionicons
                    name={dt === "Pickup" ? "walk-outline" : "bicycle-outline"}
                    size={14}
                    color={
                      deliveryType === dt ? "#fff" : colors.mutedForeground
                    }
                  />
                  <Text
                    style={[
                      s.segTxt,
                      {
                        color:
                          deliveryType === dt ? "#fff" : colors.mutedForeground,
                      },
                    ]}
                  >
                    {dt === "Pickup" ? "Store Pickup" : "Home Delivery"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {deliveryType === "Delivery" ? (
              <>
                <Text style={[s.fieldLabel, { color: colors.foreground }]}>
                  Delivery Address
                </Text>

                {/* Pressable address field — opens map picker */}
                <Pressable
                  style={[
                    s.addressPressable,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.primary + "60",
                    },
                  ]}
                  onPress={() => {
                    haptic("light");
                    setLocationPickerVisible(true);
                  }}
                >
                  <View
                    style={[
                      s.addressIconWrap,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons name="map" size={15} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[s.addressValue, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {address}
                    </Text>
                    <Text style={[s.addressHint, { color: colors.primary }]}>
                      Tap to change on map
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.primary}
                  />
                </Pressable>

                {/* Location Picker Modal */}
                <LocationPickerModal
                  visible={locationPickerVisible}
                  onClose={() => setLocationPickerVisible(false)}
                  onSelect={(addr) => {
                    setAddress(addr);
                  }}
                  currentAddress={address}
                  colors={colors}
                />

                <Text style={[s.fieldLabel, { color: colors.foreground }]}>
                  Delivery Vehicle
                </Text>
                <View
                  style={[
                    s.segmented,
                    { backgroundColor: colors.muted, marginBottom: 20 },
                  ]}
                >
                  {(["bike", "car"] as const).map((vt) => {
                    const isDisabled = vt === "bike" && routeDistanceKm > 10;
                    return (
                      <Pressable
                        key={vt}
                        style={[
                          s.seg,
                          vehicleType === vt && {
                            backgroundColor: colors.primary,
                          },
                          isDisabled && { opacity: 0.5 },
                        ]}
                        onPress={() => {
                          if (isDisabled) {
                            Alert.alert(
                              "Distance Too Long",
                              "Bicycle delivery is not available for routes over 10km. Car has been auto-selected.",
                            );
                            return;
                          }
                          setVehicleType(vt);
                          haptic("light");
                        }}
                      >
                        <Ionicons
                          name={vt === "bike" ? "bicycle" : "car-sport"}
                          size={16}
                          color={
                            vehicleType === vt ? "#fff" : colors.mutedForeground
                          }
                        />
                        <Text
                          style={[
                            s.segTxt,
                            {
                              color:
                                vehicleType === vt
                                  ? "#fff"
                                  : colors.mutedForeground,
                            },
                          ]}
                        >
                          {vt === "bike" ? "Bicycle" : "Car"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[s.fieldLabel, { color: colors.foreground }]}>
                  Delivery Instructions
                </Text>
                <View
                  style={[
                    s.inputWrap,
                    s.textAreaWrap,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                >
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
                <View
                  style={[
                    s.infoCard,
                    {
                      backgroundColor: colors.primary + "12",
                      borderColor: colors.primary + "30",
                    },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={[s.infoTxt, { color: colors.primary }]}>
                    Delivery fee:{" "}
                    <Text style={{ fontFamily: "Inter_700Bold" }}>
                      MWK {DELIVERY_FEE.toFixed(2)}
                    </Text>{" "}
                    · Est. 15–25 min
                  </Text>
                </View>
              </>
            ) : (
              <View
                style={[
                  s.pickupCard,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    s.pickupIcon,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <Text style={[s.pickupTitle, { color: colors.foreground }]}>
                  Shoprite Mzuzu
                </Text>
                <Text style={[s.pickupAddr, { color: colors.mutedForeground }]}>
                  Mzuzu Shoprite Area, CBD{"\n"}Open: Mon–Sat, 7am–7pm
                </Text>
                <View style={[s.pickupBadge, { backgroundColor: "#22C55E20" }]}>
                  <View style={[s.pickupDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={[s.pickupBadgeTxt, { color: "#22C55E" }]}>
                    Ready for pickup in ~10 min
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
        <View
          style={[
            s.stepFooter,
            {
              borderTopColor: colors.border,
              paddingBottom: footerBottom,
              paddingTop: 18,
              zIndex: 10,
            },
          ]}
        >
          <Pressable
            style={[s.checkoutBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigateTo("payment")}
          >
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
        <Animated.View
          style={[
            s.stepWrap,
            {
              paddingTop: topPad + 12,
              flex: 1,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <StepHeader
            title="Payment"
            subtitle="Secure & fast checkout"
            step={2}
            totalSteps={2}
            onBack={() => navigateTo("details")}
            colors={colors}
          />
          <PaymentStep
            selected={paymentId}
            onSelect={(id) => {
              setPaymentId(id);
              haptic("light");
            }}
            colors={colors}
            total={subtotal}
            deliveryFee={fee}
          />
        </Animated.View>
        <View
          style={[
            s.stepFooter,
            {
              borderTopColor: colors.border,
              paddingBottom: footerBottom,
              paddingTop: 18,
              zIndex: 10,
            },
          ]}
        >
          <Pressable
            style={[
              s.checkoutBtn,
              { backgroundColor: paymentId ? colors.primary : colors.muted },
            ]}
            disabled={!paymentId}
            onPress={handleCheckout}
          >
            <Ionicons
              name="lock-closed"
              size={16}
              color={paymentId ? "#fff" : colors.mutedForeground}
            />
            <Text
              style={[
                s.checkoutBtnTxt,
                { color: paymentId ? "#fff" : colors.mutedForeground },
              ]}
            >
              Confirm & Pay MWK {total.toFixed(2)}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── SUCCESS SCREEN ───────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <View
        style={[
          s.screen,
          s.successScreen,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
        <Animated.View
          style={[s.successCircle, { transform: [{ scale: successScale }] }]}
        >
          <LinearGradient colors={["#13B734", "#7C5CFC"]} style={s.successGrad}>
            <Animated.View style={{ opacity: successOpacity }}>
              <Ionicons name="checkmark" size={60} color="#fff" />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
        <Animated.View
          style={[
            { opacity: successOpacity, alignItems: "center", width: "100%" },
          ]}
        >
          <Text style={[s.successTitle, { color: colors.foreground }]}>
            Order Confirmed!
          </Text>
          <Text style={[s.successSub, { color: colors.mutedForeground }]}>
            Your order has been placed and payment is being processed.
          </Text>
          <View
            style={[
              s.successCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={s.successRow}>
              <Text
                style={[s.successRowLabel, { color: colors.mutedForeground }]}
              >
                Order ID
              </Text>
              <Text style={[s.successRowVal, { color: colors.primary }]}>
                {currentOrderId}
              </Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.successRow}>
              <Text
                style={[s.successRowLabel, { color: colors.mutedForeground }]}
              >
                Items
              </Text>
              <Text style={[s.successRowVal, { color: colors.foreground }]}>
                {snapshotItems.reduce((acc, i) => acc + i.quantity, 0)} items
              </Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.successRow}>
              <Text
                style={[s.successRowLabel, { color: colors.mutedForeground }]}
              >
                Payment
              </Text>
              <Text style={[s.successRowVal, { color: colors.foreground }]}>
                {PAYMENT_METHODS.find((m) => m.id === paymentId)?.name ?? "—"}
              </Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.successRow}>
              <Text
                style={[s.successRowLabel, { color: colors.mutedForeground }]}
              >
                Total Paid
              </Text>
              <Text
                style={[
                  s.successRowVal,
                  {
                    color: colors.foreground,
                    fontFamily: "Inter_800ExtraBold",
                  },
                ]}
              >
                MWK {total.toFixed(2)}
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
  const trackingOrder = activeOrder;
  const currentStage =
    DELIVERY_STAGES[liveStage] ?? DELIVERY_STAGES[DELIVERY_STAGES.length - 1];
  const isDelivered = liveStage >= DELIVERY_STAGES.length - 1;
  const panelTranslate = panelSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [340, 0],
  });

  return (
    <View style={s.screen}>
      <Map
        colors={colors}
        isDark={isDark}
        route={route}
        placedAt={activeOrder?.placedAt}
        destination={destination}
      />

      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
        <Pressable
          style={[
            s.topBackBtn,
            { backgroundColor: colors.card + "EE", borderColor: colors.border },
          ]}
          onPress={() => {
            setStep("cart");
            panelSlide.setValue(0);
          }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <View style={[s.orderIdPill, { backgroundColor: colors.card + "EE" }]}>
          {!isDelivered && (
            <View style={[s.liveDot, { backgroundColor: "#EF4444" }]} />
          )}
          <Text style={[s.orderIdTxt, { color: colors.foreground }]}>
            {isDelivered
              ? "✓ Delivered"
              : (trackingOrder?.orderId ?? currentOrderId)}
          </Text>
        </View>
        <Pressable
          style={[
            s.topBackBtn,
            { backgroundColor: colors.card + "EE", borderColor: colors.border },
          ]}
          onPress={() => {
            setMainView("history");
            setStep("cart");
            panelSlide.setValue(0);
            haptic("light");
          }}
        >
          <Ionicons
            name="receipt-outline"
            size={20}
            color={colors.foreground}
          />
        </Pressable>
      </View>

      {/* Call driver FAB */}
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
          {
            backgroundColor: colors.card,
            transform: [{ translateY: panelTranslate }],
          },
        ]}
      >
        <View style={s.panelHandle}>
          <View style={[s.handleBar, { backgroundColor: colors.border }]} />
        </View>

        {/* Driver info */}
        <View style={s.driverRow}>
          <View style={[s.driverAvatar, { backgroundColor: colors.primary }]}>
            <Text style={s.driverInitials}>
              {trackingOrder?.driverInitials ?? driver.initials}
            </Text>
          </View>
          <View style={s.driverInfo}>
            <Text style={[s.driverName, { color: colors.foreground }]}>
              {trackingOrder?.driverName ?? driver.name}
            </Text>
            <View style={s.driverMeta}>
              <Ionicons name="star" size={13} color="#FFB300" />
              <Text style={[s.driverRating, { color: colors.mutedForeground }]}>
                {trackingOrder?.driverRating ?? driver.rating}
              </Text>
              <Text style={[s.driverDot, { color: colors.mutedForeground }]}>
                ·
              </Text>
              <Text
                style={[s.driverVehicle, { color: colors.mutedForeground }]}
              >
                {trackingOrder?.vehicleType === "car" ? "Car" : "Motorcycle"}
              </Text>
            </View>
          </View>
          <View
            style={[s.etaBadge, { backgroundColor: colors.primary + "15" }]}
          >
            <Text style={[s.etaNum, { color: colors.primary }]}>
              {isDelivered ? "0" : liveEta}
            </Text>
            <Text style={[s.etaUnit, { color: colors.primary }]}>min</Text>
          </View>
        </View>

        {/* Stage banner */}
        <View
          style={[
            s.stageBanner,
            {
              backgroundColor: isDelivered
                ? "#22C55E18"
                : colors.primary + "12",
              borderColor: isDelivered ? "#22C55E30" : colors.primary + "30",
            },
          ]}
        >
          <Ionicons
            name={currentStage.icon}
            size={16}
            color={isDelivered ? "#22C55E" : colors.primary}
          />
          <Text
            style={[
              s.stageTxt,
              { color: isDelivered ? "#22C55E" : colors.primary },
            ]}
          >
            {currentStage.label}
          </Text>
          <View
            style={[
              s.stageProgress,
              {
                backgroundColor: isDelivered
                  ? "#22C55E20"
                  : colors.primary + "20",
              },
            ]}
          >
            <Text
              style={[
                s.stagePct,
                { color: isDelivered ? "#22C55E" : colors.primary },
              ]}
            >
              {Math.round((liveStage / (DELIVERY_STAGES.length - 1)) * 100)}%
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <ScrollView
          style={s.timelineScroll}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          <DeliveryTimeline currentStage={liveStage} colors={colors} compact />
        </ScrollView>

        {/* Items scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.itemsScroll}
        >
          {(trackingOrder?.items ?? snapshotItems).map((item: any) => (
            <View
              key={item.id}
              style={[
                s.trackCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[s.trackImgWrap, { backgroundColor: colors.muted }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={s.trackImg} />
                ) : item.imageSource ? (
                  <Image source={item.imageSource} style={s.trackImg} />
                ) : (
                  <Ionicons name="cube-outline" size={20} color={colors.mutedForeground} />
                )}
              </View>
              <Text
                style={[s.trackName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={[s.trackMeta, { color: colors.mutedForeground }]}>
                Qty {item.quantity} · Sz {item.selectedSize}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Active Order Banner ──────────────────────────────────────────────────────
function ActiveOrderBanner({
  order,
  liveStage,
  liveEta,
  colors,
  pulseAnim,
  onPress,
}: {
  order: any;
  liveStage: number;
  liveEta: number;
  colors: any;
  pulseAnim: Animated.Value;
  onPress: () => void;
}) {
  const stage = DELIVERY_STAGES[liveStage] ?? DELIVERY_STAGES[0];
  return (
    <Pressable onPress={onPress} style={styles.bannerOuter}>
      <LinearGradient
        colors={["#13B734", "#6C63FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bannerGrad}
      >
        <View style={styles.bannerLeft}>
          <Animated.View
            style={[
              styles.bannerIconWrap,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons name="bicycle" size={22} color="#fff" />
          </Animated.View>
          <View style={styles.bannerText}>
            <View style={styles.bannerTopRow}>
              <View style={styles.bannerLiveDot} />
              <Text style={styles.bannerLiveLabel}>LIVE</Text>
              <Text style={styles.bannerOrderId}>{order.orderId}</Text>
            </View>
            <Text style={styles.bannerStage} numberOfLines={1}>
              {stage.label}
            </Text>
            <Text style={styles.bannerEta}>
              {liveEta > 0 ? `Arriving in ~${liveEta} min` : "Almost there!"}
            </Text>
          </View>
        </View>
        <View style={styles.bannerCta}>
          <Text style={styles.bannerCtaTxt}>Track</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bannerOuter: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    overflow: "hidden",
  },
  bannerGrad: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  bannerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: { flex: 1 },
  bannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  bannerLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF4444",
  },
  bannerLiveLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
  },
  bannerOrderId: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.7)",
  },
  bannerStage: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 1,
  },
  bannerEta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  bannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bannerCtaTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  clearBtn: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  historyTabTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  ordersBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  ordersBadgeNum: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  historyBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Empty ──
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  emptyBtnTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  // ── History ──
  historyList: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 14,
  },
  historyCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 10,
  },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyDot: { width: 9, height: 9, borderRadius: 5 },
  historyOrderId: { fontSize: 15, fontFamily: "Inter_700Bold" },
  historyTotal: { fontSize: 16, fontFamily: "Inter_800ExtraBold" },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  historyStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDotSmall: { width: 6, height: 6, borderRadius: 3 },
  historyStatusTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  historyDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyItems: { paddingHorizontal: 16, paddingBottom: 12 },
  historyThumb: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  historyThumbImg: { width: "100%", height: "100%", resizeMode: "cover" },
  historyMore: { justifyContent: "center" },
  historyMoreTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  historyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyFooterLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  historyPayment: { fontSize: 12, fontFamily: "Inter_400Regular" },
  trackCta: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  trackCtaTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  // ── Cart ──
  listPad: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 220,
    gap: 14,
  },
  cartCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  cartImg: { height: 140, position: "relative" },
  img: { width: "100%", height: "100%", resizeMode: "cover" },
  imgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  sizeBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sizeBadgeTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  cartInfo: { padding: 14 },
  cartTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cartBrand: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  cartName: { fontSize: 17, fontFamily: "Inter_800ExtraBold" },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartPrice: { fontSize: 18, fontFamily: "Inter_800ExtraBold" },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
  },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  qtyNum: { fontSize: 14, fontFamily: "Inter_700Bold", paddingHorizontal: 8 },
  deliveryToggle: { borderRadius: 16, borderWidth: 1, padding: 16 },
  toggleLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
  },
  segmented: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4 },
  seg: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sticky: {
    position: "absolute",
    bottom: TAB_BAR_H,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  stickyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stickyLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  stickyVal: { fontSize: 22, fontFamily: "Inter_800ExtraBold" },
  feePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  feeTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  checkoutBtnTxt: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  // ── Step layout ──
  stepWrap: { flex: 1, paddingHorizontal: 20 },
  stepScroll: { paddingBottom: 24 },
  stepFooter: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    marginTop: 4,
  },
  addressPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  addressIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addressValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  addressHint: { fontSize: 11, fontFamily: "Inter_500Medium" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 14,
  },
  textAreaWrap: { alignItems: "flex-start", paddingTop: 14 },
  textArea: { height: 80, textAlignVertical: "top" },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  infoTxt: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 18,
  },
  pickupCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  pickupIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupTitle: { fontSize: 18, fontFamily: "Inter_800ExtraBold" },
  pickupAddr: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  pickupBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pickupDot: { width: 7, height: 7, borderRadius: 4 },
  pickupBadgeTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  // ── Success ──
  successScreen: {
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 32,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
  },
  successGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  successTitle: {
    fontSize: 26,
    fontFamily: "Inter_800ExtraBold",
    textAlign: "center",
  },
  successSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  successCard: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 18 },
  successRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  successRowLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  successRowVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1 },
  successHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -8 },
  // ── Tracking ──
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 20,
  },
  topBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  orderIdPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  orderIdTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  driverFab: { position: "absolute", right: 16, bottom: 360, zIndex: 20 },
  fabBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#13B734",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  panelHandle: { alignItems: "center", paddingVertical: 12 },
  handleBar: { width: 36, height: 4, borderRadius: 2 },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 14,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInitials: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_800ExtraBold",
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3 },
  driverMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  driverRating: { fontSize: 13, fontFamily: "Inter_500Medium" },
  driverDot: { fontSize: 13 },
  driverVehicle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  etaBadge: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  etaNum: { fontSize: 22, fontFamily: "Inter_800ExtraBold", lineHeight: 26 },
  etaUnit: { fontSize: 11, fontFamily: "Inter_500Medium" },
  stageBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  stageTxt: { fontSize: 13, fontFamily: "Inter_700Bold", flex: 1 },
  stageProgress: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stagePct: { fontSize: 11, fontFamily: "Inter_700Bold" },
  timelineScroll: { paddingHorizontal: 20, maxHeight: 130 },
  itemsScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    paddingBottom: 4,
  },
  trackCard: {
    width: 120,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    padding: 10,
    gap: 6,
  },
  trackImgWrap: {
    width: "100%",
    height: 70,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  trackImg: { width: "100%", height: "100%", resizeMode: "cover" },
  trackName: { fontSize: 12, fontFamily: "Inter_700Bold", lineHeight: 16 },
  trackMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
