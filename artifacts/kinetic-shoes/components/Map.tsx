import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline } from "react-native-maps";

// Dummy Route Coordinates
const STORE_COORDS = { latitude: 37.78825, longitude: -122.4324 };
const DEST_COORDS = { latitude: 37.7789, longitude: -122.4194 };
const ROUTE_COORDS = [
  STORE_COORDS,
  { latitude: 37.789, longitude: -122.425 },
  { latitude: 37.785, longitude: -122.420 },
  DEST_COORDS,
];

// Map style to match brutalist dark theme when in dark mode
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
];

export default function Map({ colors, styles }: { colors: any; styles: any }) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: 37.783,
        longitude: -122.425,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }}
      userInterfaceStyle={colors.background === "#09090b" ? "dark" : "light"}
      customMapStyle={colors.background === "#09090b" ? darkMapStyle : []}
    >
      <Polyline
        coordinates={ROUTE_COORDS}
        strokeColor="#4CAF50"
        strokeWidth={6}
        lineCap="round"
        lineJoin="round"
      />

      <Marker coordinate={STORE_COORDS} anchor={{ x: 0.5, y: 1 }}>
        <View style={styles.markerContainer}>
          <View style={styles.markerPin}>
            <Ionicons name="storefront" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.markerTriangle} />
        </View>
      </Marker>

      <Marker coordinate={DEST_COORDS} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={styles.destDot} />
      </Marker>
    </MapView>
  );
}
