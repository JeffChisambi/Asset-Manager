import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import * as ImagePicker from "expo-image-picker";
import { DeliveryService } from "@/services/delivery/delivery.service";
import { ProfileService } from "@/services/profile/profile.service";

export interface DeliveryRegistrationData {
  // Personal
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  profilePhoto: string;
  // Identity
  nationalId: string;
  idFrontPhoto: string;
  idBackPhoto: string;
  selfiePhoto: string;
  // Address
  address: string;
  city: string;
  area: string;
  landmark: string;
  // Vehicle
  vehicleType: string;
  brandModel: string;
  regNumber: string;
  color: string;
}

interface DeliveryRegistrationFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const VEHICLE_TYPES = ["Motorcycle", "Car", "Bicycle", "Van"];
const GENDERS = ["Male", "Female", "Other"];

export function DeliveryRegistrationForm({ userId, onSuccess, onCancel }: DeliveryRegistrationFormProps) {
  const colors = useColors();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<DeliveryRegistrationData>({
    fullName: "",
    phone: "",
    email: "",
    dob: "",
    gender: "Male",
    profilePhoto: "",
    nationalId: "",
    idFrontPhoto: "",
    idBackPhoto: "",
    selfiePhoto: "",
    address: "",
    city: "",
    area: "",
    landmark: "",
    vehicleType: "Motorcycle",
    brandModel: "",
    regNumber: "",
    color: "",
  });

  const updateData = (key: keyof DeliveryRegistrationData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const pickImage = async (key: keyof DeliveryRegistrationData) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera roll permissions are needed.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        updateData(key, result.assets[0].uri);
      }
    } catch (e) {
      console.log("Image picker error:", e);
      Alert.alert("Error", "Could not pick image from device.");
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Sync to local AsyncStorage and best-effort Supabase
      await DeliveryService.saveDeliveryPartner(userId, {
        fullName: formData.fullName,
        phone: formData.phone,
        dob: formData.dob,
        gender: formData.gender,
        profilePhotoUrl: formData.profilePhoto,
        nationalId: formData.nationalId,
        idFrontUrl: formData.idFrontPhoto,
        idBackUrl: formData.idBackPhoto,
        selfieUrl: formData.selfiePhoto,
        address: formData.address,
        city: formData.city,
        area: formData.area,
        landmark: formData.landmark,
        vehicleType: formData.vehicleType,
        vehicleBrand: formData.brandModel,
        vehicleReg: formData.regNumber,
        vehicleColor: formData.color,
        verificationStatus: "pending",
        availabilityStatus: "offline",
      });

      // 2. Update the user's profile title to "Delivery Partner"
      await ProfileService.updateProfile(userId, { title: "Delivery Partner" });

      Alert.alert("Success", "Your registration has been submitted and is pending verification!");
      onSuccess();
    } catch (e) {
      Alert.alert("Error", "Could not submit registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderImagePicker = (key: keyof DeliveryRegistrationData, label: string, icon: any) => {
    const uri = formData[key] as string;
    return (
      <View style={styles.modalInputGroup}>
        <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <TouchableOpacity
          style={[
            styles.imagePicker,
            { backgroundColor: colors.input, borderColor: colors.border },
          ]}
          onPress={() => pickImage(key)}
        >
          {uri ? (
            <>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={14} color="#fff" />
                <Text style={styles.imageOverlayText}>Change Image</Text>
              </View>
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name={icon} size={32} color={colors.mutedForeground} />
              <Text style={[styles.imagePlaceholderText, { color: colors.mutedForeground }]}>
                Upload Image
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((num) => (
          <View key={num} style={{ flexDirection: "row", alignItems: "center", flex: num === 4 ? 0 : 1 }}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor: step >= num ? colors.primary : colors.muted,
                  borderColor: step >= num ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: step >= num ? "#fff" : colors.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 12 }}>
                {num}
              </Text>
            </View>
            {num < 4 && (
              <View style={[styles.progressLine, { backgroundColor: step > num ? colors.primary : colors.border }]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 16 }}>
        {step === 1 && (
          <View style={styles.formGroup}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Personal Information</Text>
            
            {renderImagePicker("profilePhoto", "Profile Photo", "person-circle-outline")}

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Full Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="John Doe"
                placeholderTextColor={colors.mutedForeground}
                value={formData.fullName}
                onChangeText={(val) => updateData("fullName", val)}
              />
            </View>
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Phone Number</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="+1 234 567 8900"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(val) => updateData("phone", val)}
              />
            </View>
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Email (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="john@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(val) => updateData("email", val)}
              />
            </View>
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Gender</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.choiceBtn,
                      { backgroundColor: formData.gender === g ? colors.primary + "20" : colors.input, borderColor: formData.gender === g ? colors.primary : colors.border },
                    ]}
                    onPress={() => updateData("gender", g)}
                  >
                    <Text style={{ color: formData.gender === g ? colors.primary : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.formGroup}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Identity Verification</Text>
            
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>National ID Number</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Enter ID Number"
                placeholderTextColor={colors.mutedForeground}
                value={formData.nationalId}
                onChangeText={(val) => updateData("nationalId", val)}
              />
            </View>

            {renderImagePicker("idFrontPhoto", "ID Front Side", "card-outline")}
            {renderImagePicker("idBackPhoto", "ID Back Side", "card-outline")}
            {renderImagePicker("selfiePhoto", "Selfie for Verification", "camera-outline")}
          </View>
        )}

        {step === 3 && (
          <View style={styles.formGroup}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Address Information</Text>
            
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Residential Address</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Street Address"
                placeholderTextColor={colors.mutedForeground}
                value={formData.address}
                onChangeText={(val) => updateData("address", val)}
              />
            </View>
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>City</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="City Name"
                placeholderTextColor={colors.mutedForeground}
                value={formData.city}
                onChangeText={(val) => updateData("city", val)}
              />
            </View>
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Area / Location</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Downtown"
                placeholderTextColor={colors.mutedForeground}
                value={formData.area}
                onChangeText={(val) => updateData("area", val)}
              />
            </View>
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Nearest Landmark</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Near City Mall"
                placeholderTextColor={colors.mutedForeground}
                value={formData.landmark}
                onChangeText={(val) => updateData("landmark", val)}
              />
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.formGroup}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Vehicle Information</Text>
            
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Vehicle Type</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {VEHICLE_TYPES.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.choiceBtn,
                      { backgroundColor: formData.vehicleType === v ? colors.primary + "20" : colors.input, borderColor: formData.vehicleType === v ? colors.primary : colors.border },
                    ]}
                    onPress={() => updateData("vehicleType", v)}
                  >
                    <Text style={{ color: formData.vehicleType === v ? colors.primary : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Brand & Model</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Honda Civic"
                placeholderTextColor={colors.mutedForeground}
                value={formData.brandModel}
                onChangeText={(val) => updateData("brandModel", val)}
              />
            </View>
            
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Registration Number (License Plate)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. ABC 1234"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                value={formData.regNumber}
                onChangeText={(val) => updateData("regNumber", val)}
              />
            </View>
            
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Vehicle Color</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Silver"
                placeholderTextColor={colors.mutedForeground}
                value={formData.color}
                onChangeText={(val) => updateData("color", val)}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        {step === 1 ? (
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.muted, flex: 1 }]}
            onPress={onCancel}
          >
            <Text style={[styles.footerBtnText, { color: colors.foreground }]}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.muted, flex: 1 }]}
            onPress={handlePrev}
          >
            <Text style={[styles.footerBtnText, { color: colors.foreground }]}>Back</Text>
          </TouchableOpacity>
        )}
        
        {step < 4 ? (
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.primary, flex: 2 }]}
            onPress={handleNext}
          >
            <Text style={styles.footerBtnTextPrimary}>Next Step</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.primary, flex: 2 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.footerBtnTextPrimary}>Submit Registration</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  formGroup: {
    gap: 16,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 8,
  },
  modalInputGroup: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  imagePicker: {
    borderWidth: 1.5,
    borderRadius: 12,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  imageOverlayText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  imagePlaceholder: {
    alignItems: "center",
    gap: 6,
  },
  imagePlaceholderText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  choiceBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  footerBtnTextPrimary: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
