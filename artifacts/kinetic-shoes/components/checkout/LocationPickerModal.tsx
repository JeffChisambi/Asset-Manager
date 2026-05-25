import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, Modal, Pressable, StyleSheet, TextInput,
  ScrollView, Animated, Platform, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import Map from "@/components/Map";
import { fetchRoute, LatLng } from "@/lib/routing";

const { height: SCREEN_H } = Dimensions.get("window");

// ─── Mzuzu & Northern Region locations ─────────────────────────────────────────
export const MZUZU_LOCATIONS = [
  { id: "luwinga",     name: "Luwinga",        detail: "Luwinga, Mzuzu",               lat: -11.3931, lng: 34.0000, icon: "🏭" },
  { id: "chimaliro",   name: "Chimaliro",      detail: "Chimaliro, Mzuzu",             lat: -11.4503, lng: 34.0317, icon: "🏡" },
  { id: "zolozolo",    name: "Zolozolo",       detail: "Zolozolo, Mzuzu",              lat: -11.4391, lng: 34.0294, icon: "🏘️" },
  { id: "mchengautuba",name: "Mchengautuba",   detail: "Mchengautuba, Mzuzu",          lat: -11.4541, lng: 33.9912, icon: "🏘️" },
  { id: "katawa",      name: "Katawa",         detail: "Katawa, Mzuzu",                lat: -11.4520, lng: 34.0250, icon: "🏡" },
  { id: "masasa",      name: "Masasa",         detail: "Masasa, Mzuzu",                lat: -11.4700, lng: 34.0200, icon: "🌿" },
  { id: "chibanja",    name: "Chibanja",       detail: "Chibanja, Mzuzu",              lat: -11.4450, lng: 34.0150, icon: "🏡" },
  { id: "shoprite",    name: "Shoprite Area",  detail: "Near Shoprite Mzuzu",          lat: -11.4620, lng: 34.0143, icon: "🛒" },
  { id: "livingstonia",name: "Livingstonia",   detail: "Livingstonia, Rumphi",         lat: -10.6099, lng: 34.1073, icon: "⛰️" },
];

export const STORE_COORD: LatLng = { latitude: -11.4619641, longitude: 34.0143435 }; // Shoprite Mzuzu

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
  currentAddress: string;
  colors: any;
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export default function LocationPickerModal({ visible, onClose, onSelect, currentAddress, colors }: Props) {
  const [query,       setQuery]       = useState("");
  const [selected,    setSelected]    = useState<typeof MZUZU_LOCATIONS[0] | null>(null);
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [gpsError,    setGpsError]    = useState("");
  
  const [previewRoute, setPreviewRoute] = useState<LatLng[]>([]);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      // Pre-select if address matches
      const match = MZUZU_LOCATIONS.find(l => currentAddress.includes(l.name));
      if (match) setSelected(match);
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }).start();
    } else {
      slideAnim.setValue(SCREEN_H);
      setQuery("");
    }
  }, [visible, currentAddress, slideAnim]);

  // Fetch route when selected location changes to display an accurate preview path
  useEffect(() => {
    if (!selected) {
      setPreviewRoute([]);
      return;
    }
    let isActive = true;
    const dest = { latitude: selected.lat, longitude: selected.lng };
    fetchRoute(STORE_COORD, dest)
      .then(route => {
        if (isActive) setPreviewRoute(route);
      })
      .catch(() => {
        if (isActive) setPreviewRoute([STORE_COORD, dest]);
      });
      
    return () => { isActive = false; };
  }, [selected]);

  const filtered = query.trim()
    ? MZUZU_LOCATIONS.filter(
        l =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.detail.toLowerCase().includes(query.toLowerCase())
      )
    : MZUZU_LOCATIONS;

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
            <Text style={[ms.subtitle, { color: colors.mutedForeground }]}>Mzuzu & Northern Region</Text>
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
          <View style={[ms.mapWrap, { borderColor: colors.border }]}>
            <Map 
              colors={colors} 
              route={previewRoute} 
              destination={{ latitude: selected.lat, longitude: selected.lng }} 
            />
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
          {query ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : "Northern Region Areas"}
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
  mapWrap:     { marginHorizontal: 16, marginTop: 8, height: 180, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  searchWrap:  { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 14, marginBottom: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
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
