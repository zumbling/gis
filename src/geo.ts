import type { LatLng } from "./types";

const EARTH_RADIUS_M = 6371008.8;
const toRad = Math.PI / 180;
const toDeg = 180 / Math.PI;

export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function bearingDeg(from: LatLng, to: LatLng): number {
  const lat1 = from.lat * toRad;
  const lat2 = to.lat * toRad;
  const dLng = (to.lng - from.lng) * toRad;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * toDeg + 360) % 360;
}

export function destination(from: LatLng, bearing: number, meters: number): LatLng {
  const d = meters / EARTH_RADIUS_M;
  const b = bearing * toRad;
  const lat1 = from.lat * toRad;
  const lng1 = from.lng * toRad;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 =
    lng1 +
    Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 * toDeg, lng: lng2 * toDeg };
}

export function searchRadiusM(accuracyM: number): number {
  return Math.min(100, Math.max(50, Math.ceil(accuracyM * 2)));
}

export type AccuracyGrade = "good" | "caution" | "uncertain";

export function accuracyGrade(accuracyM: number): AccuracyGrade {
  if (accuracyM <= 15) return "good";
  if (accuracyM <= 30) return "caution";
  return "uncertain";
}

export const ACCURACY_LABEL: Record<AccuracyGrade, string> = {
  good: "양호",
  caution: "주의",
  uncertain: "위치 불명확",
};
