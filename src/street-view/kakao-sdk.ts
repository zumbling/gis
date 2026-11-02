// 이 프로젝트에서 쓰는 카카오 지도 SDK 범위만 선언한다.
export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoViewpoint {
  pan: number;
  tilt: number;
  zoom: number;
}

export interface KakaoRoadview {
  setPanoId(panoId: number, position: KakaoLatLng): void;
  setViewpoint(viewpoint: KakaoViewpoint): void;
  getPosition(): KakaoLatLng;
}

export interface KakaoOverlay {
  setMap(map: KakaoMap | null): void;
}

export interface KakaoMarker extends KakaoOverlay {
  setPosition(position: KakaoLatLng): void;
  getPosition(): KakaoLatLng;
}

export interface KakaoMap {
  setBounds(bounds: unknown): void;
  relayout(): void;
}

export interface KakaoMouseEvent {
  latLng: KakaoLatLng;
}

export interface KakaoMapsSdk {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => { extend(position: KakaoLatLng): void };
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Marker: new (options: { position: KakaoLatLng; map?: KakaoMap; title?: string; draggable?: boolean }) => KakaoMarker;
  Circle: new (options: Record<string, unknown>) => KakaoOverlay;
  Polygon: new (options: Record<string, unknown>) => KakaoOverlay;
  Polyline: new (options: Record<string, unknown>) => KakaoOverlay;
  Roadview: new (container: HTMLElement) => KakaoRoadview;
  RoadviewClient: new () => {
    getNearestPanoId(position: KakaoLatLng, radius: number, callback: (panoId: number | null) => void): void;
  };
  event: {
    addListener(target: object, type: string, handler: (event: KakaoMouseEvent) => void): void;
  };
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsSdk };
  }
}
