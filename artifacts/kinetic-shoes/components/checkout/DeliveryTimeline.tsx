import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const DELIVERY_STAGES = [
  { icon: "receipt-outline" as const,     label: "Order Placed",      sublabel: "Your order has been received" },
  { icon: "shield-checkmark" as const,    label: "Payment Verified",  sublabel: "Payment confirmed" },
  { icon: "storefront-outline" as const,  label: "Store Confirmed",   sublabel: "Store is preparing your order" },
  { icon: "person-circle-outline" as const, label: "Driver Assigned", sublabel: "A rider is heading to the store" },
  { icon: "bicycle-outline" as const,     label: "Heading to Store",  sublabel: "Rider en route to pickup" },
  { icon: "bag-check-outline" as const,   label: "Order Picked Up",   sublabel: "Rider has your order" },
  { icon: "navigate-outline" as const,    label: "En Route to You",   sublabel: "Rider is on the way" },
  { icon: "location-outline" as const,    label: "Driver Nearby",     sublabel: "Almost there..." },
  { icon: "home-outline" as const,        label: "Delivered!",        sublabel: "Your order has arrived" },
  { icon: "star-outline" as const,        label: "Completed",         sublabel: "Thank you for ordering!" },
];

interface Props {
  currentStage: number;
  colors: any;
  compact?: boolean;
}

export default function DeliveryTimeline({ currentStage, colors, compact = false }: Props) {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const visibleStages = compact
    ? DELIVERY_STAGES.slice(Math.max(0, currentStage - 1), currentStage + 3)
    : DELIVERY_STAGES;

  return (
    <View style={styles.container}>
      {visibleStages.map((stage, visIdx) => {
        const realIdx = compact
          ? Math.max(0, currentStage - 1) + visIdx
          : visIdx;

        const isCompleted = realIdx < currentStage;
        const isCurrent   = realIdx === currentStage;
        const isFuture    = realIdx > currentStage;
        const isLast      = realIdx === DELIVERY_STAGES.length - 1;

        return (
          <View key={realIdx} style={styles.row}>
            {/* Left: line + dot column */}
            <View style={styles.dotCol}>
              {/* Top connector line */}
              {visIdx > 0 && (
                <View style={[
                  styles.lineTop,
                  { backgroundColor: isCompleted || isCurrent ? colors.primary : colors.border },
                ]} />
              )}

              {/* Dot */}
              {isCurrent ? (
                <Animated.View style={[
                  styles.dotOuter,
                  { backgroundColor: colors.primary + "30", transform: [{ scale: pulseAnim }] },
                ]}>
                  <View style={[styles.dotInner, { backgroundColor: colors.primary }]}>
                    <Ionicons name={stage.icon} size={10} color="#fff" />
                  </View>
                </Animated.View>
              ) : (
                <View style={[
                  styles.dotSimple,
                  {
                    backgroundColor: isCompleted ? colors.primary : colors.muted,
                    borderColor: isCompleted ? colors.primary : colors.border,
                  },
                ]}>
                  {isCompleted && <Ionicons name="checkmark" size={10} color="#fff" />}
                </View>
              )}

              {/* Bottom connector line */}
              {!isLast && (
                <View style={[
                  styles.lineBottom,
                  { backgroundColor: isCompleted ? colors.primary : colors.border },
                ]} />
              )}
            </View>

            {/* Right: text */}
            <View style={styles.textCol}>
              <Text style={[
                styles.label,
                {
                  color: isFuture ? colors.mutedForeground : colors.foreground,
                  fontFamily: isCurrent ? "Inter_700Bold" : "Inter_500Medium",
                  fontSize: isCurrent ? 14 : 13,
                },
              ]}>
                {stage.label}
              </Text>
              {(isCompleted || isCurrent) && !compact && (
                <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>
                  {stage.sublabel}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 4 },
  row: {
    flexDirection: "row",
    minHeight: 44,
  },
  dotCol: {
    width: 36,
    alignItems: "center",
  },
  lineTop: {
    width: 2,
    flex: 1,
    marginBottom: 2,
    minHeight: 6,
  },
  lineBottom: {
    width: 2,
    flex: 1,
    marginTop: 2,
    minHeight: 6,
  },
  dotOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dotInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dotSimple: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    paddingLeft: 10,
    justifyContent: "center",
    paddingBottom: 4,
  },
  label: { lineHeight: 18 },
  sublabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
    lineHeight: 16,
  },
});
