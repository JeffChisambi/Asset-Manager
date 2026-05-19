import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from "react-native-svg";

const { width, height } = Dimensions.get("window");
const H = Math.max(height, 600);

// SVG pixel positions (store → driver → dest)
const STORE_PX  = { x: width * 0.28, y: H * 0.60 };
const DEST_PX   = { x: width * 0.78, y: H * 0.34 };

// Route arc control point
const CP = { x: width * 0.50, y: H * 0.30 };

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

interface MapProps {
  colors: any;
  isDark?: boolean;
  onProgressUpdate?: (p: number) => void;
}

export default function Map({ colors, isDark = false, onProgressUpdate }: MapProps) {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const pulseOpacity = useRef(new Animated.Value(0.8)).current;
  const driverBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim,    { toValue: 2.0, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseAnim,    { toValue: 0.6, duration: 1100, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0.1, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.8, duration: 1100, useNativeDriver: true }),
        ]),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(driverBounce, { toValue: -5, duration: 500, useNativeDriver: true }),
        Animated.timing(driverBounce, { toValue: 0,  duration: 500, useNativeDriver: true }),
      ])
    ).start();
    const tick = setInterval(() => {
      progressRef.current = Math.min(progressRef.current + 0.005, 1);
      setProgress(progressRef.current);
      onProgressUpdate?.(progressRef.current);
      if (progressRef.current >= 1) clearInterval(tick);
    }, 400);
    return () => clearInterval(tick);
  }, []);

  // Quadratic bezier point
  function bezier(t: number) {
    const x = (1 - t) * (1 - t) * STORE_PX.x + 2 * (1 - t) * t * CP.x + t * t * DEST_PX.x;
    const y = (1 - t) * (1 - t) * STORE_PX.y + 2 * (1 - t) * t * CP.y + t * t * DEST_PX.y;
    return { x, y };
  }
  const driverPos = bezier(progress);

  const bgColor  = isDark ? "#1a1f2e" : "#f0f3ff";
  const roadColor = isDark ? "#2a3050" : "#dce3ff";
  const roadAlt   = isDark ? "#232840" : "#e8ecff";

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, overflow: "hidden" }]}>
      {/* Grid roads */}
      <Svg style={StyleSheet.absoluteFill} width={width} height={H}>
        {/* horizontal roads */}
        {[0.2, 0.35, 0.50, 0.65, 0.80].map((yf, i) => (
          <Line key={`hr${i}`} x1={0} y1={H * yf} x2={width} y2={H * yf} stroke={roadColor} strokeWidth={i % 2 === 0 ? 16 : 8} />
        ))}
        {/* vertical roads */}
        {[0.15, 0.30, 0.45, 0.60, 0.75, 0.88].map((xf, i) => (
          <Line key={`vr${i}`} x1={width * xf} y1={0} x2={width * xf} y2={H} stroke={i % 2 === 0 ? roadColor : roadAlt} strokeWidth={i % 2 === 0 ? 14 : 6} />
        ))}

        {/* Route: full path dashed */}
        <Path
          d={`M ${STORE_PX.x} ${STORE_PX.y} Q ${CP.x} ${CP.y} ${DEST_PX.x} ${DEST_PX.y}`}
          fill="none"
          stroke="#4A80F0"
          strokeOpacity={0.25}
          strokeWidth={6}
          strokeDasharray="10,8"
          strokeLinecap="round"
        />
        {/* Route: traveled portion (solid) */}
        {progress > 0.02 && (
          <Path
            d={`M ${STORE_PX.x} ${STORE_PX.y} Q ${CP.x} ${CP.y} ${driverPos.x} ${driverPos.y}`}
            fill="none"
            stroke="#4A80F0"
            strokeWidth={6}
            strokeLinecap="round"
          />
        )}
      </Svg>

      {/* Store pin */}
      <View style={[styles.storePinWrap, { left: STORE_PX.x - 19, top: STORE_PX.y - 46 }]}>
        <View style={[styles.storePin, { backgroundColor: "#FF6B35" }]}>
          <Ionicons name="storefront" size={15} color="#fff" />
        </View>
        <View style={[styles.pinTriangle, { borderTopColor: "#FF6B35" }]} />
      </View>

      {/* Destination pulse */}
      <Animated.View style={[
        styles.destPulse,
        { left: DEST_PX.x - 20, top: DEST_PX.y - 20, backgroundColor: "#4A80F020",
          transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
      ]} />
      <View style={[styles.destCore, { left: DEST_PX.x - 9, top: DEST_PX.y - 9, backgroundColor: "#4A80F0" }]} />

      {/* Driver marker */}
      <Animated.View style={[
        styles.driverWrap,
        { left: driverPos.x - 23, top: driverPos.y - 23, transform: [{ translateY: driverBounce }] },
      ]}>
        <View style={[styles.driverRing, { borderColor: "#4A80F0" }]}>
          <View style={[styles.driverCore, { backgroundColor: "#4A80F0" }]}>
            <Ionicons name="bicycle" size={14} color="#fff" />
          </View>
        </View>
      </Animated.View>

      {/* Lilongwe label */}
      <Text style={[styles.cityLabel, { color: isDark ? "#ffffff30" : "#00000018" }]}>
        LILONGWE
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  storePinWrap: { position: "absolute", alignItems: "center" },
  storePin: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  pinTriangle: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    marginTop: -1,
  },
  destPulse: {
    position: "absolute", width: 40, height: 40, borderRadius: 20,
  },
  destCore: {
    position: "absolute", width: 18, height: 18, borderRadius: 9,
    borderWidth: 3, borderColor: "#fff",
    shadowColor: "#4A80F0", shadowOpacity: 0.5, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  driverWrap: { position: "absolute" },
  driverRing: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 2.5,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#4A80F0", shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  driverCore: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  cityLabel: {
    position: "absolute", bottom: 120, alignSelf: "center",
    fontSize: 48, fontFamily: "Inter_800ExtraBold", letterSpacing: 12,
  },
});
