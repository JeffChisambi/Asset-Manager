import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

const { width } = Dimensions.get("window");
const mapImage = require("@/assets/images/map_background.png");

// Dummy Route Coordinates
const STORE_COORDS = { latitude: 37.78825, longitude: -122.4324 };
const DEST_COORDS = { latitude: 37.7789, longitude: -122.4194 };
const ROUTE_COORDS = [
  STORE_COORDS,
  { latitude: 37.789, longitude: -122.425 },
  { latitude: 37.785, longitude: -122.420 },
  DEST_COORDS,
];

export default function Map({ colors, styles }: { colors: any; styles: any }) {
  return (
    <>
      <Image source={mapImage} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={styles.mapOverlay}>
        <Svg height="100%" width="100%">
          <Path
            d={`M ${width * 0.55} 240 C ${width * 0.8} 240, ${width * 0.8} 350, ${width * 0.8} 500 C ${width * 0.8} 550, ${width * 0.85} 580, ${width * 0.9} 590`}
            fill="none"
            stroke="#4CAF50"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <Circle cx={width * 0.9} cy={590} r="6" fill="#FFA726" stroke="#FFFFFF" strokeWidth="3" />
        </Svg>
        <View style={[styles.markerContainer, { position: "absolute", left: width * 0.55 - 20, top: 240 - 50 }]}>
          <View style={styles.markerPin}>
            <Ionicons name="storefront" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.markerTriangle} />
        </View>
      </View>
    </>
  );
}
