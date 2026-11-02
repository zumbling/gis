import { bearingDeg, distanceM } from "../geo";
import type { LatLng, RoadviewResult } from "../types";
import type { KakaoMapsSdk, KakaoRoadview } from "./kakao-sdk";

const INIT_TIMEOUT_MS = 8000;
// 파노라마가 목표 지점과 거의 겹치면 방위각이 불안정해 측정 방향을 그대로 쓴다.
const MIN_BEARING_DISTANCE_M = 2;

let loading: Promise<KakaoMapsSdk> | null = null;

export const hasKakaoKey = () => Boolean(import.meta.env.VITE_KAKAO_JS_KEY);

export function loadKakao(): Promise<KakaoMapsSdk> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_JS_KEY}&autoload=false`;
    script.onload = () => {
      const sdk = window.kakao?.maps;
      if (sdk) sdk.load(() => resolve(sdk));
      else reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("카카오 지도 SDK를 불러오지 못했습니다. 키와 등록 도메인을 확인하세요."));
    };
    document.head.append(script);
  });
  return loading;
}

export interface RoadviewRequest {
  photo: LatLng;
  target: LatLng;
  radiusM: number;
  heading: number | null;
}

export function viewpointPan(pano: LatLng, target: LatLng, heading: number | null): number | null {
  if (heading === null) return null;
  return distanceM(pano, target) < MIN_BEARING_DISTANCE_M ? heading : bearingDeg(pano, target);
}

export function showRoadview(
  sdk: KakaoMapsSdk,
  container: HTMLElement,
  request: RoadviewRequest,
): Promise<RoadviewResult> {
  const position = new sdk.LatLng(request.target.lat, request.target.lng);
  const client = new sdk.RoadviewClient();

  return new Promise((resolve, reject) => {
    client.getNearestPanoId(position, request.radiusM, (panoId) => {
      if (panoId === null) {
        resolve({ found: false });
        return;
      }

      const roadview: KakaoRoadview = new sdk.Roadview(container);
      const timer = setTimeout(() => reject(new Error("로드뷰를 표시하지 못했습니다.")), INIT_TIMEOUT_MS);

      sdk.event.addListener(roadview, "init", () => {
        clearTimeout(timer);
        const panoPosition = roadview.getPosition();
        const pano = { lat: panoPosition.getLat(), lng: panoPosition.getLng() };
        const pan = viewpointPan(pano, request.target, request.heading);
        if (pan !== null) roadview.setViewpoint({ pan, tilt: 0, zoom: 0 });
        resolve({
          found: true,
          panoId: String(panoId),
          panoLat: pano.lat,
          panoLng: pano.lng,
          panoDistanceM: distanceM(request.photo, pano),
          ...(pan !== null ? { panDeg: pan } : {}),
        });
      });

      roadview.setPanoId(panoId, position);
    });
  });
}
