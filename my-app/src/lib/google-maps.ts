// Google Maps settings and theme helpers shared by every map in the app.

import { useSyncExternalStore } from "react";

// Set these in .env.local. The key must have the "Maps JavaScript API" enabled,
// plus the "Routes API" for drawing routes and their travel times.
export const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// Markers need a map ID. Google's demo ID works for development; create your own for production.
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

export const TIMISOARA = { lat: 45.7558, lng: 21.2287 };

// Pin colors per theme, matching the accent purple in src/lib/styles.ts.
export const PIN_COLORS = {
  light: { background: "#4E418C", border: "#372D66", glyph: "#FFFFFF", line: "#4E418C" },
  dark: { background: "#B9ADEB", border: "#FFFFFF", glyph: "#1F1A3D", line: "#B9ADEB" },
};

// The theme is the `dark` class on <html> (see ThemeToggle), so watch that class.
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function useIsDark() {
  return useSyncExternalStore(
    subscribeToTheme,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}
