export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationFix extends LatLng {
  accuracyM: number;
  at: number;
}

export type HeadingSource = "ios-webkit" | "android-absolute" | "unavailable";
export type ViewMatch = "match" | "partial" | "mismatch" | "no-pano";

export interface RecordLocation extends LatLng {
  accuracyM: number;
  fixAgeMs: number;
}

export interface RecordOrientation {
  rawHeading: number | null;
  heading: number | null;
  headingSource: HeadingSource;
  headingStdDev: number | null;
  compassAccuracy: number | null;
  beta: number | null;
  gamma: number | null;
  screenAngle: number | null;
}

export interface RoadviewResult {
  found: boolean;
  panoId?: string;
  panoLat?: number;
  panoLng?: number;
  panoDistanceM?: number;
  panDeg?: number;
}

export interface Review {
  actualLat?: number;
  actualLng?: number;
  actualHeading?: number;
  gpsErrorM?: number;
  headingErrorDeg?: number;
  viewMatch?: ViewMatch;
  memo?: string;
}

export interface CaptureRecord {
  id: string;
  photo: Blob;
  capturedAt: string;
  tester: string;
  device: { platform: "ios" | "android" | "other"; userAgent: string };
  location: RecordLocation | null;
  orientation: RecordOrientation;
  streetView: { kakao?: RoadviewResult };
  review: Review;
}
