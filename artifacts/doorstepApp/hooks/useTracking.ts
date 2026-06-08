import { useState, useEffect } from "react";
import { useOrder, calcStage, calcEta } from "@/context/OrderContext";
import { DELIVERY_STAGES } from "@/components/checkout/DeliveryTimeline";
import { fetchRoute, LatLng, STORE_COORD } from "@/lib/routing";
import { MZUZU_LOCATIONS } from "@/components/checkout/LocationPickerModal";

export function useTracking() {
  const { activeOrder, completeOrder } = useOrder();
  
  const [route, setRoute] = useState<LatLng[]>([]);
  const [liveStage, setLiveStage] = useState(0);
  const [liveEta, setLiveEta] = useState(0);
  
  // Fetch real route from OSRM when order starts
  useEffect(() => {
    if (!activeOrder) return;
    
    // Parse user's destination
    let destination: LatLng = { latitude: -11.4503, longitude: 34.0317 }; // default to Chimaliro, Mzuzu
    
    if (activeOrder.address) {
      const match = MZUZU_LOCATIONS.find(l => activeOrder.address.includes(l.name) || l.detail === activeOrder.address);
      if (match) {
        destination = { latitude: match.lat, longitude: match.lng };
      }
    }

    let isActive = true;
    fetchRoute(STORE_COORD, destination)
      .then((coords) => {
        if (isActive) setRoute(coords);
      })
      .catch((e) => {
        console.error("Route fetch failed", e);
        if (isActive) setRoute([STORE_COORD, destination]); // fallback straight line
      });

    return () => { isActive = false; };
  }, [activeOrder]);

  // Main tracking ticker (1s)
  useEffect(() => {
    if (!activeOrder) return;

    const tick = () => {
      const stage = calcStage(activeOrder.placedAt);
      const eta = calcEta(activeOrder.placedAt);
      
      setLiveStage(stage);
      setLiveEta(eta);

      const TOTAL_STAGES = DELIVERY_STAGES ? DELIVERY_STAGES.length : 10;
      if (stage >= TOTAL_STAGES - 1) {
        completeOrder();
      }
    };

    tick();
    const interval = setInterval(tick, 1000); 
    return () => clearInterval(interval);
  }, [activeOrder, completeOrder]);

  return {
    activeOrder,
    route,
    liveStage,
    liveEta,
    vehicleType: activeOrder?.vehicleType ?? "bike",
    destination: route.length > 0 ? route[route.length - 1] : STORE_COORD,
  };
}
