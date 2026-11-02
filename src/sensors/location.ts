import type { LocationFix, RecordLocation } from "../types";

const KEEP_MS = 10000;
const PICK_WINDOW_MS = 5000;

// 최근 값 중 정확도가 가장 좋은 값을 고르고, 없으면 가장 최근 값을 쓴다.
export function pickFix(fixes: LocationFix[], now: number, windowMs = PICK_WINDOW_MS): LocationFix | null {
  if (fixes.length === 0) return null;
  const recent = fixes.filter((fix) => now - fix.at <= windowMs);
  if (recent.length === 0) return fixes.reduce((a, b) => (b.at > a.at ? b : a));
  return recent.reduce((a, b) => (b.accuracyM <= a.accuracyM ? b : a));
}

export class LocationTracker {
  private fixes: LocationFix[] = [];
  private watchId: number | null = null;
  error: string | null = null;

  start(): void {
    if (!("geolocation" in navigator)) {
      this.error = "이 브라우저는 위치 기능을 지원하지 않습니다.";
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.error = null;
        const at = position.timestamp;
        this.fixes = this.fixes.filter((fix) => at - fix.at <= KEEP_MS);
        this.fixes.push({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
          at,
        });
      },
      (error) => {
        this.error = error.code === error.PERMISSION_DENIED ? "위치 권한이 거부되었습니다." : "위치를 받지 못하고 있습니다.";
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }

  stop(): void {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.fixes = [];
  }

  snapshot(now = Date.now()): RecordLocation | null {
    const fix = pickFix(this.fixes, now);
    if (!fix) return null;
    return { lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM, fixAgeMs: Math.max(0, now - fix.at) };
  }
}
