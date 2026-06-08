import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { LatLng, getCoordinateAtProgress } from "@/lib/routing";

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

export interface MapProps {
  colors: any;
  isDark?: boolean;
  route: LatLng[];
  placedAt?: number;
  destination: LatLng;
  vehicleType?: "bike" | "car";
}

export default function Map({ colors, isDark = false, route, placedAt, destination, vehicleType = "bike" }: MapProps) {
  const mapRef = useRef<MapView>(null);
  
  const [driverCoord, setDriverCoord] = useState<LatLng>(route.length > 0 ? route[0] : { latitude: 0, longitude: 0 });
  const [traveledRoute, setTraveledRoute] = useState<LatLng[]>([]);
  const [remainingRoute, setRemainingRoute] = useState<LatLng[]>([]);

  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const pulseOpacity = useRef(new Animated.Value(0.8)).current;
  const driverAnim = useRef(new Animated.Value(0)).current;

  // Fit map to route when it changes
  useEffect(() => {
    if (route.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(route, {
        edgePadding: { top: 100, right: 50, bottom: 400, left: 50 }, // account for bottom panel
        animated: true,
      });
    }
  }, [route]);

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

  // Smooth driver movement logic using requestAnimationFrame
  useEffect(() => {
    if (route.length === 0) return;

    if (!placedAt) {
      // Static preview mode: no driver, just show the whole route
      setTraveledRoute([]);
      setRemainingRoute(route);
      return;
    }

    let reqId: number;
    const durationMs = 30000; // 30s per stage
    const TOTAL_STAGES = 10;
    const totalDuration = (TOTAL_STAGES - 1) * durationMs;

    const animate = () => {
      const elapsed = Date.now() - placedAt;
      const p = Math.min(1, Math.max(0, elapsed / totalDuration));
      
      const pos = getCoordinateAtProgress(route, p);
      setDriverCoord(pos);

      const sliceIdx = Math.floor(p * (route.length - 1));
      
      const traveled = [...route.slice(0, sliceIdx + 1), pos];
      const remaining = [pos, ...route.slice(sliceIdx + 1)];
      
      setTraveledRoute(traveled);
      setRemainingRoute(remaining);

      if (p < 1) {
        reqId = requestAnimationFrame(animate);
      }
    };
    
    reqId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqId);
  }, [placedAt, route]);

  const mapStyle = isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
  const PRIMARY = "#13B734";

  const storeCoord = route.length > 0 ? route[0] : { latitude: 0, longitude: 0 };

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_DEFAULT}
      customMapStyle={mapStyle}
      userInterfaceStyle={isDark ? "dark" : "light"}
      showsCompass={false}
      showsScale={false}
      pitchEnabled={false}
      toolbarEnabled={false}
    >
      {route.length > 0 && (
        <>
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
          <Marker coordinate={storeCoord} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <View style={styles.storePinWrap}>
              <View style={[styles.storePin, { backgroundColor: "#FF6B35" }]}>
                <Ionicons name="storefront" size={16} color="#fff" />
              </View>
              <View style={[styles.pinTriangle, { borderTopColor: "#FF6B35" }]} />
            </View>
          </Marker>

          {/* Driver Marker */}
          {placedAt && (
            <Marker coordinate={driverCoord} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={true}>
              <Animated.View style={[styles.driverWrap, { transform: [{ translateY: driverAnim }] }]}>
                <View style={[styles.driverRing, { borderColor: PRIMARY }]}>
                  <View style={[styles.driverCore, { backgroundColor: PRIMARY }]}>
                    <Ionicons name={vehicleType === "car" ? "car-sport" : "bicycle"} size={16} color="#fff" />
                  </View>
                </View>
              </Animated.View>
            </Marker>
          )}

          {/* Destination Marker — pulsing */}
          <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.destWrap}>
              <Animated.View style={[
                styles.destPulse,
                { backgroundColor: PRIMARY + "35", transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
              ]} />
              <View style={[styles.destCore, { backgroundColor: PRIMARY, borderColor: "#fff" }]} />
            </View>
          </Marker>
        </>
      )}
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
    shadowColor: "#13B734",
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
    shadowColor: "#13B734",
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
    shadowColor: "#13B734",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});
