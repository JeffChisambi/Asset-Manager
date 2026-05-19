import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";

// ─── Malawi / Lilongwe Coordinates ──────────────────────────────────────────
const STORE_COORD  = { latitude: -13.9626, longitude: 33.7741 }; // Old Town Market
const DEST_COORD   = { latitude: -13.9501, longitude: 33.7970 }; // Area 47
const MAP_INITIAL  = {
  latitude:      -13.9563,
  longitude:      33.7855,
  latitudeDelta:  0.028,
  longitudeDelta: 0.028,
};

const ROUTE_WAYPOINTS = [
  STORE_COORD,
  { latitude: -13.9600, longitude: 33.7790 },
  { latitude: -13.9575, longitude: 33.7840 },
  { latitude: -13.9540, longitude: 33.7905 },
  DEST_COORD,
];

// ─── Branded Map Styles ──────────────────────────────────────────────────────
const LIGHT_MAP_STYLE = [
  { elementType: "geometry",       stylers: [{ color: "#f8f9ff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#555B78" }] },
  { featureType: "road",           elementType: "geometry",       stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road.arterial",  elementType: "geometry",       stylers: [{ color: "#EEF1FF" }] },
  { featureType: "road.highway",   elementType: "geometry",       stylers: [{ color: "#C5D0FF" }] },
  { featureType: "road.highway",   elementType: "geometry.stroke", stylers: [{ color: "#A0B0FF" }] },
  { featureType: "water",          elementType: "geometry",       stylers: [{ color: "#C8DEFF" }] },
  { featureType: "poi.park",       elementType: "geometry",       stylers: [{ color: "#D8F5D8" }] },
  { featureType: "poi",            stylers: [{ visibility: "off" }] },
  { featureType: "transit",        stylers: [{ visibility: "off" }] },
];

const DARK_MAP_STYLE = [
  { elementType: "geometry",       stylers: [{ color: "#1a1f2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8B96BB" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1f2e" }] },
  { featureType: "road",           elementType: "geometry",       stylers: [{ color: "#2a3050" }] },
  { featureType: "road.arterial",  elementType: "geometry",       stylers: [{ color: "#232840" }] },
  { featureType: "road.highway",   elementType: "geometry",       stylers: [{ color: "#3a4570" }] },
  { featureType: "road.highway",   elementType: "geometry.stroke", stylers: [{ color: "#2a3560" }] },
  { featureType: "water",          elementType: "geometry",       stylers: [{ color: "#0d1526" }] },
  { featureType: "poi.park",       elementType: "geometry",       stylers: [{ color: "#1a2a1a" }] },
  { featureType: "poi",            stylers: [{ visibility: "off" }] },
  { featureType: "transit",        stylers: [{ visibility: "off" }] },
];

// ─── Helper: interpolate position along multi-segment route ─────────────────
function interpolateRoute(waypoints: typeof ROUTE_WAYPOINTS, t: number) {
  const n = waypoints.length - 1;
  const scaled = t * n;
  const seg = Math.min(Math.floor(scaled), n - 1);
  const segT = scaled - seg;
  const from = waypoints[seg];
  const to   = waypoints[seg + 1];
  return {
    latitude:  from.latitude  + (to.latitude  - from.latitude)  * segT,
    longitude: from.longitude + (to.longitude - from.longitude) * segT,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
interface MapProps {
  colors: any;
  isDark?: boolean;
  onProgressUpdate?: (progress: number) => void;
}

export default function Map({ colors, isDark = false, onProgressUpdate }: MapProps) {
  const [driverCoord, setDriverCoord] = useState(ROUTE_WAYPOINTS[0]);
  const progressRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const pulseOpacity = useRef(new Animated.Value(0.8)).current;
  const driverAnim = useRef(new Animated.Value(0)).current;

  // Pulse the destination marker
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim,    { toValue: 1.8, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseAnim,    { toValue: 0.6, duration: 1100, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0.15, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.8,  duration: 1100, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  // Bounce the driver icon
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(driverAnim, { toValue: -4, duration: 500, useNativeDriver: true }),
        Animated.timing(driverAnim, { toValue:  0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Move driver along route
  useEffect(() => {
    const tick = setInterval(() => {
      progressRef.current = Math.min(progressRef.current + 0.004, 1);
      const pos = interpolateRoute(ROUTE_WAYPOINTS, progressRef.current);
      setDriverCoord(pos);
      onProgressUpdate?.(progressRef.current);
      if (progressRef.current >= 1) clearInterval(tick);
    }, 400);
    return () => clearInterval(tick);
  }, []);

  const mapStyle = isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
  const PRIMARY = "#4A80F0";

  // Build route so far (store → current driver position)
  const traveledRoute = [STORE_COORD, driverCoord];
  const remainingRoute = [driverCoord, ...ROUTE_WAYPOINTS.slice(
    Math.max(1, Math.min(Math.floor(progressRef.current * (ROUTE_WAYPOINTS.length - 1)), ROUTE_WAYPOINTS.length - 2))
  )];

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_DEFAULT}
      initialRegion={MAP_INITIAL}
      customMapStyle={mapStyle}
      userInterfaceStyle={isDark ? "dark" : "light"}
      showsCompass={false}
      showsScale={false}
      pitchEnabled={false}
      toolbarEnabled={false}
    >
      {/* Route: traveled (solid blue) */}
      <Polyline
        coordinates={traveledRoute}
        strokeColor={PRIMARY}
        strokeWidth={5}
        lineCap="round"
        lineJoin="round"
      />

      {/* Route: remaining (dashed blue) */}
      <Polyline
        coordinates={remainingRoute}
        strokeColor={PRIMARY + "60"}
        strokeWidth={5}
        lineDashPattern={[8, 8]}
        lineCap="round"
        lineJoin="round"
      />

      {/* Store Marker */}
      <Marker coordinate={STORE_COORD} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
        <View style={styles.storePinWrap}>
          <View style={[styles.storePin, { backgroundColor: "#FF6B35" }]}>
            <Ionicons name="storefront" size={16} color="#fff" />
          </View>
          <View style={[styles.pinTriangle, { borderTopColor: "#FF6B35" }]} />
        </View>
      </Marker>

      {/* Driver Marker */}
      <Marker coordinate={driverCoord} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={true}>
        <Animated.View style={[styles.driverWrap, { transform: [{ translateY: driverAnim }] }]}>
          <View style={[styles.driverRing, { borderColor: PRIMARY }]}>
            <View style={[styles.driverCore, { backgroundColor: PRIMARY }]}>
              <Ionicons name="bicycle" size={16} color="#fff" />
            </View>
          </View>
        </Animated.View>
      </Marker>

      {/* Destination Marker — pulsing */}
      <Marker coordinate={DEST_COORD} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
        <View style={styles.destWrap}>
          <Animated.View style={[
            styles.destPulse,
            { backgroundColor: PRIMARY + "35", transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
          ]} />
          <View style={[styles.destCore, { backgroundColor: PRIMARY, borderColor: "#fff" }]} />
        </View>
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  storePinWrap: { alignItems: "center" },
  storePin: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pinTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  driverWrap: { alignItems: "center", justifyContent: "center" },
  driverRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    shadowColor: "#4A80F0",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  driverCore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  destWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  destPulse: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  destCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    shadowColor: "#4A80F0",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});
