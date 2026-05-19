import React from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  gradient: [string, string];
  badge?: string;
  extraFee?: number;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "airtel",
    name: "Airtel Money",
    description: "Pay instantly via Airtel Mobile Money",
    icon: "phone-portrait-outline",
    gradient: ["#E8001C", "#FF6B35"],
    badge: "Most Popular",
    extraFee: 0,
  },
  {
    id: "tnm",
    name: "TNM Mpamba",
    description: "Pay via TNM Mpamba wallet",
    icon: "phone-portrait-outline",
    gradient: ["#00A651", "#00C853"],
    badge: undefined,
    extraFee: 0,
  },
  {
    id: "card",
    name: "Card Payment",
    description: "Visa or Mastercard accepted",
    icon: "card-outline",
    gradient: ["#4A80F0", "#7C5CFC"],
    badge: undefined,
    extraFee: 0.5,
  },
  {
    id: "cash",
    name: "Cash on Delivery",
    description: "Pay in cash when order arrives",
    icon: "cash-outline",
    gradient: ["#F59E0B", "#EF4444"],
    badge: undefined,
    extraFee: 0,
  },
];

interface Props {
  selected: string | null;
  onSelect: (id: string) => void;
  colors: any;
  total: number;
  deliveryFee: number;
}

export default function PaymentStep({ selected, onSelect, colors, total, deliveryFee }: Props) {
  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === selected);
  const extraFee = selectedMethod?.extraFee ?? 0;
  const grandTotal = total + deliveryFee + extraFee;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Payment</Text>
      <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
        Choose your preferred payment method
      </Text>

      <View style={styles.methods}>
        {PAYMENT_METHODS.map((method) => {
          const isSelected = selected === method.id;
          return (
            <Pressable
              key={method.id}
              onPress={() => onSelect(method.id)}
              style={[
                styles.card,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: colors.card,
                  borderWidth: isSelected ? 2 : 1,
                  shadowColor: isSelected ? colors.primary : "#000",
                  shadowOpacity: isSelected ? 0.18 : 0.04,
                  shadowRadius: isSelected ? 12 : 4,
                  shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                  elevation: isSelected ? 8 : 2,
                },
              ]}
            >
              {/* Gradient icon swatch */}
              <LinearGradient
                colors={method.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconBg}
              >
                <Ionicons name={method.icon} size={22} color="#fff" />
              </LinearGradient>

              {/* Text */}
              <View style={styles.cardText}>
                <View style={styles.nameRow}>
                  <Text style={[styles.methodName, { color: colors.foreground }]}>
                    {method.name}
                  </Text>
                  {method.badge && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {method.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.methodDesc, { color: colors.mutedForeground }]}>
                  {method.description}
                </Text>
                {method.extraFee && method.extraFee > 0 ? (
                  <Text style={[styles.fee, { color: colors.mutedForeground }]}>
                    +${method.extraFee.toFixed(2)} processing fee
                  </Text>
                ) : (
                  <Text style={[styles.fee, { color: "#22C55E" }]}>No extra fees</Text>
                )}
              </View>

              {/* Checkmark */}
              <View style={[
                styles.check,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primary : "transparent",
                },
              ]}>
                {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Order Summary */}
      <View style={[styles.summary, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>${total.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Delivery Fee</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {deliveryFee === 0 ? "Free" : `$${deliveryFee.toFixed(2)}`}
          </Text>
        </View>
        {extraFee > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Processing Fee</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>${extraFee.toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>${grandTotal.toFixed(2)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  methods: { gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
    flexWrap: "wrap",
  },
  methodName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  methodDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  fee: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  summary: {
    marginTop: 24,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  summaryTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  totalValue: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
});
