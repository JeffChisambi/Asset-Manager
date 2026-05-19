import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, Modal, Pressable, StyleSheet, TextInput,
  ScrollView, Animated, Platform, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

// ─── Lilongwe neighbourhoods ──────────────────────────────────────────────────
export const LILONGWE_LOCATIONS = [
  { id: "area47",    name: "Area 47",           detail: "Lilongwe, Area 47 Estate",    lat: -13.9501, lng: 33.7970, icon: "🏘️" },
  { id: "area3",     name: "Area 3",            detail: "Lilongwe, Area 3",             lat: -13.9602, lng: 33.7804, icon: "🏡" },
  { id: "area18",    name: "Area 18",           detail: "Lilongwe, Area 18",            lat: -13.9711, lng: 33.7834, icon: "🏘️" },
  { id: "area25",    name: "Area 25",           detail: "Lilongwe, Area 25",            lat: -13.9840, lng: 33.8050, icon: "🏘️" },
  { id: "area49",    name: "Area 49",           detail: "Lilongwe, Area 49",            lat: -13.9450, lng: 33.8100, icon: "🏡" },
  { id: "biwi",      name: "Biwi",             detail: "Biwi, Lilongwe",               lat: -13.9550, lng: 33.7650, icon: "🌿" },
  { id: "kanengo",   name: "Kanengo",          detail: "Kanengo Industrial Area",      lat: -13.9200, lng: 33.7700, icon: "🏭" },
  { id: "crossroads",name: "Crossroads",       detail: "Crossroads, Lilongwe",         lat: -13.9800, lng: 33.7900, icon: "🏪" },
  { id: "oldtown",   name: "Old Town",         detail: "Old Town Market, Lilongwe",    lat: -13.9626, lng: 33.7741, icon: "🛒" },
  { id: "capital",   name: "Capital Hill",     detail: "Capital Hill, Lilongwe",       lat: -13.9669, lng: 33.7875, icon: "🏛️" },
  { id: "citycentre",name: "City Centre",      detail: "Lilongwe City Centre Mall",    lat: -13.9750, lng: 33.7920, icon: "🏬" },
  { id: "areaone",   name: "Area 1",           detail: "Area 1, Lilongwe",             lat: -13.9620, lng: 33.7890, icon: "🏡" },
  { id: "area10",    name: "Area 10",          detail: "Lilongwe, Area 10",            lat: -13.9650, lng: 33.7780, icon: "🏘️" },
  { id: "area43",    name: "Area 43",          detail: "Lilongwe, Area 43",            lat: -13.9480, lng: 33.7860, icon: "🏘️" },
  { id: "lumbadzi",  name: "Lumbadzi",        detail: "Lumbadzi, near Lilongwe",      lat: -13.8600, lng: 33.7500, icon: "🌾" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
  currentAddress: string;
  colors: any;
}

// ─── Mini SVG Map Preview ────────────────────────────────────────────────────
function MiniMap({ lat, lng, colors }: { lat: number; lng: number; colors: any }) {
  const pinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pinAnim, { toValue: -6, duration: 600, useNativeDriver: true }),
        Animated.timing(pinAnim, { toValue: 0,  duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [lat, lng]);

  // Normalize lat/lng to canvas coords (Lilongwe bounding box)
  const LAT_MIN = -14.02, LAT_MAX = -13.84;
  const LNG_MIN = 33.70,  LNG_MAX = 33.87;
  const MAP_W = SCREEN_W - 32, MAP_H = 180;

  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W;
  const y = ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * MAP_H;

  const grid = [];
  for (let i = 0; i <= 8; i++) {
    grid.push(
      <View key={`h${i}`} style={[mms.gridLine, { top: (MAP_H / 8) * i, left: 0, right: 0, height: 1 }]} />,
      <View key={`v${i}`} style={[mms.gridLine, { left: (MAP_W / 8) * i, top: 0, bottom: 0, width: 1 }]} />
    );
  }

  return (
    <View style={[mms.map, { backgroundColor: colors.primary + "08", borderColor: colors.border, width: MAP_W, height: MAP_H }]}>
      {grid}
      {/* Roads */}
      <View style={[mms.road, mms.roadH, { top: MAP_H * 0.35, backgroundColor: colors.mutedForeground + "30" }]} />
      <View style={[mms.road, mms.roadH, { top: MAP_H * 0.65, backgroundColor: colors.mutedForeground + "30" }]} />
      <View style={[mms.road, mms.roadV, { left: MAP_W * 0.38, backgroundColor: colors.mutedForeground + "30" }]} />
      <View style={[mms.road, mms.roadV, { left: MAP_W * 0.60, backgroundColor: colors.mutedForeground + "30" }]} />
      {/* Main road highlight */}
      <View style={[mms.road, mms.roadH, { top: MAP_H * 0.5, backgroundColor: colors.primary + "40", height: 4 }]} />
      <View style={[mms.road, mms.roadV, { left: MAP_W * 0.5, backgroundColor: colors.primary + "40", width: 4 }]} />

      {/* Pin */}
      <Animated.View style={[mms.pinWrap, { left: x - 14, top: y - 36, transform: [{ translateY: pinAnim }] }]}>
        <LinearGradient colors={["#4A80F0","#6C63FF"]} style={mms.pinGrad}>
          <Ionicons name="location" size={16} color="#fff" />
        </LinearGradient>
        <View style={[mms.pinTail, { borderTopColor: "#4A80F0" }]} />
      </Animated.View>
      {/* Pulse ring */}
      <View style={[mms.pulse, { left: x - 16, top: y - 16, borderColor: colors.primary + "40" }]} />

      {/* Compass */}
      <View style={[mms.compass, { backgroundColor: colors.card }]}>
        <Text style={{ fontSize: 10 }}>N</Text>
      </View>
    </View>
  );
}
const mms = StyleSheet.create({
  map: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 14 },
  gridLine: { position: "absolute", backgroundColor: "rgba(0,0,0,0.04)" },
  road: { position: "absolute" },
  roadH: { left: 0, right: 0, height: 3 },
  roadV: { top: 0, bottom: 0, width: 3 },
  pinWrap: { position: "absolute", alignItems: "center" },
  pinGrad: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", shadowColor: "#4A80F0", shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  pinTail: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: "transparent", borderRightColor: "transparent", marginTop: -1 },
  pulse: { position: "absolute", width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  compass: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
});

// ─── Main Modal ──────────────────────────────────────────────────────────────
export default function LocationPickerModal({ visible, onClose, onSelect, currentAddress, colors }: Props) {
  const [query,       setQuery]       = useState("");
  const [selected,    setSelected]    = useState<typeof LILONGWE_LOCATIONS[0] | null>(null);
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [gpsError,    setGpsError]    = useState("");
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      // Pre-select if address matches
      const match = LILONGWE_LOCATIONS.find(l => currentAddress.includes(l.name));
      if (match) setSelected(match);
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }).start();
    } else {
      slideAnim.setValue(SCREEN_H);
      setQuery("");
    }
  }, [visible]);

  const filtered = query.trim()
    ? LILONGWE_LOCATIONS.filter(
        l =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.detail.toLowerCase().includes(query.toLowerCase())
      )
    : LILONGWE_LOCATIONS;

  const handleGps = useCallback(async () => {
    setGpsLoading(true);
    setGpsError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError("Location permission denied. Please select manually.");
        setGpsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const addr = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (addr.length > 0) {
        const a = addr[0];
        const formatted = [a.street, a.district, a.city ?? a.region, "Malawi"].filter(Boolean).join(", ");
        onSelect(formatted);
        onClose();
      } else {
        setGpsError("Could not resolve address. Select manually.");
      }
    } catch {
      setGpsError("Could not get location. Select manually.");
    }
    setGpsLoading(false);
  }, [onSelect, onClose]);

  const handleConfirm = useCallback(() => {
    if (!selected) return;
    onSelect(selected.detail);
    onClose();
  }, [selected, onSelect, onClose]);

  const isIOS = Platform.OS === "ios";

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Pressable style={ms.backdrop} onPress={onClose}>
        <View style={ms.backdropFill} />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        style={[ms.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        {/* Handle */}
        <View style={ms.handleWrap}>
          <View style={[ms.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View style={ms.header}>
          <View>
            <Text style={[ms.title, { color: colors.foreground }]}>Choose Location</Text>
            <Text style={[ms.subtitle, { color: colors.mutedForeground }]}>Lilongwe, Malawi</Text>
          </View>
          <Pressable onPress={onClose} style={[ms.closeBtn, { backgroundColor: colors.muted }]} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.foreground} />
          </Pressable>
        </View>

        {/* GPS button */}
        <Pressable
          style={[ms.gpsBtn, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}
          onPress={handleGps}
        >
          <View style={[ms.gpsIcon, { backgroundColor: colors.primary }]}>
            {gpsLoading
              ? <Ionicons name="sync" size={16} color="#fff" />
              : <Ionicons name="navigate" size={16} color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ms.gpsTxt, { color: colors.primary }]}>
              {gpsLoading ? "Getting your location…" : "Use my current location"}
            </Text>
            <Text style={[ms.gpsSub, { color: colors.primary + "99" }]}>Requires location permission</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
        {!!gpsError && (
          <Text style={[ms.gpsErr, { color: "#EF4444" }]}>{gpsError}</Text>
        )}

        {/* Map preview */}
        {selected && (
          <View style={ms.mapWrap}>
            <MiniMap lat={selected.lat} lng={selected.lng} colors={colors} />
          </View>
        )}

        {/* Search */}
        <View style={[ms.searchWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={[ms.searchInput, { color: colors.foreground }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search area, e.g. Area 47, Biwi…"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <Text style={[ms.sectionLabel, { color: colors.mutedForeground }]}>
          {query ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : "Lilongwe Areas"}
        </Text>

        {/* Location list */}
        <ScrollView
          style={ms.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {filtered.map((loc) => {
            const isActive = selected?.id === loc.id;
            return (
              <Pressable
                key={loc.id}
                style={[
                  ms.locRow,
                  { borderColor: isActive ? colors.primary : colors.border, backgroundColor: isActive ? colors.primary + "0C" : colors.card },
                ]}
                onPress={() => setSelected(loc)}
              >
                <View style={[ms.locEmoji, { backgroundColor: isActive ? colors.primary + "18" : colors.muted }]}>
                  <Text style={{ fontSize: 20 }}>{loc.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ms.locName, { color: colors.foreground }]}>{loc.name}</Text>
                  <Text style={[ms.locDetail, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {loc.detail}
                  </Text>
                </View>
                {isActive && (
                  <View style={[ms.checkCircle, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
          {filtered.length === 0 && (
            <View style={ms.noResults}>
              <Ionicons name="search-outline" size={36} color={colors.mutedForeground} />
              <Text style={[ms.noResultsTxt, { color: colors.mutedForeground }]}>No areas match "{query}"</Text>
            </View>
          )}
        </ScrollView>

        {/* Confirm */}
        <View style={[ms.footer, { borderTopColor: colors.border }]}>
          <Pressable
            style={[ms.confirmBtn, { backgroundColor: selected ? colors.primary : colors.muted }]}
            disabled={!selected}
            onPress={handleConfirm}
          >
            <Ionicons name="location" size={18} color={selected ? "#fff" : colors.mutedForeground} />
            <Text style={[ms.confirmTxt, { color: selected ? "#fff" : colors.mutedForeground }]}>
              {selected ? `Deliver to ${selected.name}` : "Select a location above"}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1 },
  backdropFill:{ flex: 1 },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.92,
    zIndex: 2,
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: -8 }, elevation: 30,
  },
  handleWrap:  { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  handle:      { width: 36, height: 4, borderRadius: 2 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14 },
  title:       { fontSize: 20, fontFamily: "Inter_800ExtraBold" },
  subtitle:    { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn:    { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  gpsBtn:      { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, marginBottom: 6, borderRadius: 14, borderWidth: 1, padding: 14 },
  gpsIcon:     { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  gpsTxt:      { fontSize: 14, fontFamily: "Inter_700Bold" },
  gpsSub:      { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  gpsErr:      { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 20, marginBottom: 8 },
  mapWrap:     { paddingHorizontal: 16, marginTop: 8 },
  searchWrap:  { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 4, marginBottom: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  sectionLabel:{ fontSize: 12, fontFamily: "Inter_600SemiBold", paddingHorizontal: 20, marginBottom: 8, letterSpacing: 0.5 },
  list:        { maxHeight: 260, paddingHorizontal: 16 },
  locRow:      { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  locEmoji:    { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  locName:     { fontSize: 15, fontFamily: "Inter_700Bold" },
  locDetail:   { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  noResults:   { alignItems: "center", paddingVertical: 32, gap: 10 },
  noResultsTxt:{ fontSize: 14, fontFamily: "Inter_400Regular" },
  footer:      { borderTopWidth: 1, padding: 16, paddingBottom: Platform.OS === "ios" ? 32 : 16 },
  confirmBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
  confirmTxt:  { fontSize: 16, fontFamily: "Inter_700Bold" },
});
