import { Platform } from "react-native";

export interface LatLng {
  latitude: number;
  longitude: number;
}

export const STORE_COORD: LatLng = { latitude: -11.4619641, longitude: 34.0143435 };

const CACHE = new Map<string, LatLng[]>();

/**
 * Decodes an OSRM geometry polyline into an array of LatLng objects.
 * We manually decode the standard 5-precision Google polyline used by OSRM.
 */
function decodePolyline(str: string, precision: number = 5): LatLng[] {
  let index = 0, lat = 0, lng = 0, coordinates: LatLng[] = [];
  const shift = Math.pow(10, precision);

  while (index < str.length) {
    let byte = 0, shiftCount = 0, result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shiftCount;
      shiftCount += 5;
    } while (byte >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shiftCount = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shiftCount;
      shiftCount += 5;
    } while (byte >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push({ latitude: lat / shift, longitude: lng / shift });
  }

  return coordinates;
}

/**
 * Fetches a driving route from OSRM between start and end coordinates.
 * Returns an array of coordinates forming the route.
 */
export async function fetchRoute(start: LatLng, end: LatLng): Promise<LatLng[]> {
  const cacheKey = `${start.latitude},${start.longitude};${end.latitude},${end.longitude}`;
  if (CACHE.has(cacheKey)) {
    return CACHE.get(cacheKey)!;
  }

  try {
    // OSRM expects coordinates in longitude,latitude order
    const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=polyline`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    // Decode polyline string into coordinates array
    const encodedPolyline = data.routes[0].geometry;
    const decoded = decodePolyline(encodedPolyline);
    
    if (decoded.length === 0) {
      throw new Error("Route decoding failed");
    }

    // Cache the successful route
    CACHE.set(cacheKey, decoded);
    return decoded;
  } catch (error) {
    console.warn("Failed to fetch OSRM route, falling back to direct line:", error);
    // Fallback: Just draw a straight line if routing fails (for robustness)
    const fallback = [start, end];
    return fallback;
  }
}

// Linear interpolation between two coordinates
export function interpolate(p1: LatLng, p2: LatLng, fraction: number): LatLng {
  return {
    latitude: p1.latitude + (p2.latitude - p1.latitude) * fraction,
    longitude: p1.longitude + (p2.longitude - p1.longitude) * fraction,
  };
}

// Calculate total distance of a route
export function routeDistance(route: LatLng[]): number {
  let dist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const dx = route[i + 1].longitude - route[i].longitude;
    const dy = route[i + 1].latitude - route[i].latitude;
    dist += Math.sqrt(dx * dx + dy * dy);
  }
  return dist;
}

// Get the exact coordinate on the polyline for a given progress [0, 1]
export function getCoordinateAtProgress(route: LatLng[], progress: number): LatLng {
  if (route.length === 0) return { latitude: 0, longitude: 0 };
  if (progress <= 0 || route.length === 1) return route[0];
  if (progress >= 1) return route[route.length - 1];

  const totalDist = routeDistance(route);
  const targetDist = totalDist * progress;

  let currentDist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const dx = route[i + 1].longitude - route[i].longitude;
    const dy = route[i + 1].latitude - route[i].latitude;
    const segDist = Math.sqrt(dx * dx + dy * dy);

    if (currentDist + segDist >= targetDist) {
      const remaining = targetDist - currentDist;
      const fraction = segDist === 0 ? 0 : remaining / segDist;
      return interpolate(route[i], route[i + 1], fraction);
    }
    currentDist += segDist;
  }
  return route[route.length - 1];
}

// Earth's radius in kilometers
const R = 6371; 

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Calculate true physical distance of a route in kilometers
export function calculateRouteDistanceKm(route: LatLng[]): number {
  let dist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const p1 = route[i];
    const p2 = route[i + 1];
    const dLat = deg2rad(p2.latitude - p1.latitude);
    const dLon = deg2rad(p2.longitude - p1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(p1.latitude)) * Math.cos(deg2rad(p2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    dist += R * c;
  }
  return dist;
}
