import { Platform } from "react-native";

export const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configuredUrl)
    return configuredUrl.endsWith("/api")
      ? configuredUrl
      : `${configuredUrl}/api`;
  return Platform.OS === "android"
    ? "http://10.0.2.2:5001/api"
    : "http://localhost:5001/api";
};

export const resolveImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  
  // If the URL contains localhost or 127.0.0.1, we must rewrite it so physical devices/emulators can reach the host machine.
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    const apiBase = getApiBaseUrl().replace("/api", "");
    try {
      const urlObj = new URL(url);
      return `${apiBase}${urlObj.pathname}${urlObj.search}`;
    } catch (e) {
      // Fallback if URL parsing fails
      return url.replace(/http:\/\/(localhost|127\.0\.0\.1):\d+/, apiBase);
    }
  }
  
  return url;
};
