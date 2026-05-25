import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export interface DeliveryPartnerData {
  userId: string;
  fullName: string;
  phone: string;
  dob: string;
  gender: string;
  profilePhotoUrl?: string;
  nationalId: string;
  idFrontUrl: string;
  idBackUrl: string;
  selfieUrl: string;
  address: string;
  city: string;
  area: string;
  landmark?: string;
  gpsLocation?: string;
  vehicleType: string;
  vehicleBrand: string;
  vehicleReg: string;
  vehicleColor: string;
  vehiclePhotoUrl?: string;
  drivingLicenseUrl?: string;
  proofOfOwnershipUrl?: string;
  verificationStatus: "pending" | "approved" | "rejected";
  availabilityStatus: "online" | "offline";
}

export class DeliveryService {
  static async getDeliveryPartner(userId: string): Promise<DeliveryPartnerData | null> {
    // 1. Try Supabase
    try {
      const { data, error } = await supabase
        .from("delivery_partners")
        .select("*")
        .eq("user_id", parseInt(userId, 10) || userId)
        .maybeSingle();
      
      if (data && !error) {
        const mapped: DeliveryPartnerData = {
          userId: String(data.user_id),
          fullName: data.full_name,
          phone: data.phone,
          dob: data.dob,
          gender: data.gender,
          profilePhotoUrl: data.profile_photo_url,
          nationalId: data.national_id,
          idFrontUrl: data.id_front_url,
          idBackUrl: data.id_back_url,
          selfieUrl: data.selfie_url,
          address: data.address,
          city: data.city,
          area: data.area,
          landmark: data.landmark || undefined,
          gpsLocation: data.gps_location || undefined,
          vehicleType: data.vehicle_type,
          vehicleBrand: data.vehicle_brand,
          vehicleReg: data.vehicle_reg,
          vehicleColor: data.vehicle_color,
          vehiclePhotoUrl: data.vehicle_photo_url || undefined,
          drivingLicenseUrl: data.driving_license_url || undefined,
          proofOfOwnershipUrl: data.proof_of_ownership_url || undefined,
          verificationStatus: (data.verification_status as any) || "pending",
          availabilityStatus: (data.availability_status as any) || "offline",
        };
        await AsyncStorage.setItem(`delivery_partner_${userId}`, JSON.stringify(mapped));
        return mapped;
      }
    } catch (err) {
      console.log("Supabase getDeliveryPartner failed:", err);
    }

    // 2. Try AsyncStorage fallback
    try {
      const raw = await AsyncStorage.getItem(`delivery_partner_${userId}`);
      return raw ? (JSON.parse(raw) as DeliveryPartnerData) : null;
    } catch {
      return null;
    }
  }

  static async saveDeliveryPartner(userId: string, data: Partial<DeliveryPartnerData>): Promise<void> {
    const fullData: DeliveryPartnerData = {
      userId,
      fullName: data.fullName || "",
      phone: data.phone || "",
      dob: data.dob || "",
      gender: data.gender || "Male",
      profilePhotoUrl: data.profilePhotoUrl || "",
      nationalId: data.nationalId || "",
      idFrontUrl: data.idFrontUrl || "",
      idBackUrl: data.idBackUrl || "",
      selfieUrl: data.selfieUrl || "",
      address: data.address || "",
      city: data.city || "",
      area: data.area || "",
      landmark: data.landmark || "",
      gpsLocation: data.gpsLocation || "",
      vehicleType: data.vehicleType || "Motorcycle",
      vehicleBrand: data.vehicleBrand || "",
      vehicleReg: data.vehicleReg || "",
      vehicleColor: data.vehicleColor || "",
      vehiclePhotoUrl: data.vehiclePhotoUrl || data.selfieUrl || "",
      drivingLicenseUrl: data.drivingLicenseUrl || data.idFrontUrl || "",
      proofOfOwnershipUrl: data.proofOfOwnershipUrl || data.idBackUrl || "",
      verificationStatus: data.verificationStatus || "pending",
      availabilityStatus: data.availabilityStatus || "offline",
    };

    // 1. Save locally to AsyncStorage
    await AsyncStorage.setItem(`delivery_partner_${userId}`, JSON.stringify(fullData));

    // 2. Try Supabase sync
    try {
      const numericUserId = parseInt(userId, 10);
      const payload = {
        user_id: isNaN(numericUserId) ? userId : numericUserId,
        full_name: fullData.fullName,
        phone: fullData.phone,
        dob: fullData.dob,
        gender: fullData.gender,
        profile_photo_url: fullData.profilePhotoUrl,
        national_id: fullData.nationalId,
        id_front_url: fullData.idFrontUrl,
        id_back_url: fullData.idBackUrl,
        selfie_url: fullData.selfieUrl,
        address: fullData.address,
        city: fullData.city,
        area: fullData.area,
        landmark: fullData.landmark,
        gps_location: fullData.gpsLocation,
        vehicle_type: fullData.vehicleType,
        vehicle_brand: fullData.vehicleBrand,
        vehicle_reg: fullData.vehicleReg,
        vehicle_color: fullData.vehicleColor,
        vehicle_photo_url: fullData.vehiclePhotoUrl,
        driving_license_url: fullData.drivingLicenseUrl,
        proof_of_ownership_url: fullData.proofOfOwnershipUrl,
        verification_status: fullData.verificationStatus,
        availability_status: fullData.availabilityStatus,
      };

      // Check if already exists in Supabase
      const { data: existing, error: selectError } = await supabase
        .from("delivery_partners")
        .select("id")
        .eq("user_id", isNaN(numericUserId) ? userId : numericUserId)
        .maybeSingle();

      if (existing && !selectError) {
        const { error: updateError } = await supabase
          .from("delivery_partners")
          .update(payload)
          .eq("user_id", isNaN(numericUserId) ? userId : numericUserId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("delivery_partners")
          .insert([payload]);
        if (insertError) throw insertError;
      }
    } catch (err) {
      console.log("Supabase saveDeliveryPartner failed:", err);
    }
  }

  static async updateAvailabilityStatus(userId: string, status: "online" | "offline"): Promise<void> {
    const existing = await this.getDeliveryPartner(userId);
    if (existing) {
      existing.availabilityStatus = status;
      await AsyncStorage.setItem(`delivery_partner_${userId}`, JSON.stringify(existing));
      
      try {
        const numericUserId = parseInt(userId, 10);
        await supabase
          .from("delivery_partners")
          .update({ availability_status: status })
          .eq("user_id", isNaN(numericUserId) ? userId : numericUserId);
      } catch (err) {
        console.log("Supabase updateAvailabilityStatus failed:", err);
      }
    }
  }
}
