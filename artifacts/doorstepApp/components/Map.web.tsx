import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LatLng, getCoordinateAtProgress } from "@/lib/routing";

export interface MapProps {
  colors: any;
  isDark?: boolean;
  route: LatLng[];
  placedAt?: number;
  destination: LatLng;
  vehicleType?: "bike" | "car";
}

let MapContainer: any, TileLayer: any, Marker: any, Polyline: any, L: any;
let isLeafletLoaded = false;

if (typeof window !== "undefined") {
  try {
    const ReactLeaflet = require("react-leaflet");
    MapContainer = ReactLeaflet.MapContainer;
    TileLayer = ReactLeaflet.TileLayer;
    Marker = ReactLeaflet.Marker;
    Polyline = ReactLeaflet.Polyline;
    L = require("leaflet");
    require("leaflet/dist/leaflet.css");
    isLeafletLoaded = true;

    // Fix missing icon issues in Leaflet
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
      iconUrl: require("leaflet/dist/images/marker-icon.png"),
      shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
    });
  } catch (e) {
    console.warn("Failed to load leaflet", e);
  }
}

// Custom Leaflet Icons mapped from our styling
function getCustomIcon(type: "store" | "driver" | "dest", isDark: boolean, vehicleType: "bike" | "car" = "bike") {
  if (!L) return null;
  const color = type === "store" ? "#FF6B35" : "#13B734";
  let emoji = "📍";
  if (type === "store") emoji = "🏪";
  if (type === "driver") emoji = vehicleType === "car" ? "🚗" : "🚴";
  
  const size = type === "driver" ? 46 : 38;
  const fontSize = type === "driver" ? 24 : 18;

  const html = `
    <div style="
      background: ${type === 'driver' ? 'rgba(255,255,255,0.9)' : color};
      border: ${type === 'driver' ? '2px solid #13B734' : 'none'};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      font-size: ${fontSize}px;
    ">
      ${emoji}
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-leaflet-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function Map({ colors, isDark = false, route, placedAt, destination, vehicleType = "bike" }: MapProps) {
  const [driverCoord, setDriverCoord] = useState<LatLng>(route.length > 0 ? route[0] : { latitude: 0, longitude: 0 });
  const [traveledRoute, setTraveledRoute] = useState<LatLng[]>([]);
  const [remainingRoute, setRemainingRoute] = useState<LatLng[]>([]);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (route.length > 0 && mapRef.current && L) {
      const bounds = L.latLngBounds(route.map(p => [p.latitude, p.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [route]);

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

  if (!isLeafletLoaded) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.loadingWrap, { backgroundColor: isDark ? "#1a1f2e" : "#f8f9ff" }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading Map...</Text>
      </View>
    );
  }

  const PRIMARY = "#13B734";
  const storeCoord = route.length > 0 ? route[0] : { latitude: 0, longitude: 0 };
  
  // Convert LatLng[] to [lat, lng][] for Leaflet
  const toLeafletRoute = (pts: LatLng[]) => pts.map(p => [p.latitude, p.longitude] as [number, number]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapContainer 
        ref={mapRef}
        center={[storeCoord.latitude, storeCoord.longitude]} 
        zoom={13} 
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"}
        />

        {route.length > 0 && (
          <>
            {/* Traveled Route */}
            <Polyline positions={toLeafletRoute(traveledRoute)} pathOptions={{ color: PRIMARY, weight: 5, lineCap: "round" }} />
            
            {/* Remaining Route */}
            <Polyline positions={toLeafletRoute(remainingRoute)} pathOptions={{ color: PRIMARY, weight: 5, dashArray: "8, 8", lineCap: "round", opacity: 0.6 }} />

            <Marker position={[storeCoord.latitude, storeCoord.longitude]} icon={getCustomIcon("store", isDark)} />
            
            {placedAt && (
              <Marker position={[driverCoord.latitude, driverCoord.longitude]} icon={getCustomIcon("driver", isDark, vehicleType)} />
            )}
            
            <Marker position={[destination.latitude, destination.longitude]} icon={getCustomIcon("dest", isDark)} />
          </>
        )}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { alignItems: "center", justifyContent: "center" },
});
