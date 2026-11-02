import { describe, expect, it, vi } from "vitest";
import { showRoadview, viewpointPan } from "../src/street-view/kakao";
import type { KakaoMapsSdk } from "../src/street-view/kakao-sdk";

function fakeSdk(panoId: number | null, pano = { lat: 37.5509, lng: 126.94 }) {
  const setViewpoint = vi.fn();
  const setPanoId = vi.fn();
  const handlers: Record<string, () => void> = {};
  const sdk = {
    LatLng: class {
      constructor(
        private lat: number,
        private lng: number,
      ) {}
      getLat = () => this.lat;
      getLng = () => this.lng;
    },
    RoadviewClient: class {
      getNearestPanoId(_position: unknown, _radius: number, callback: (id: number | null) => void) {
        callback(panoId);
      }
    },
    Roadview: class {
      setPanoId = (...args: unknown[]) => {
        setPanoId(...args);
        handlers.init();
      };
      setViewpoint = setViewpoint;
      getPosition = () => ({ getLat: () => pano.lat, getLng: () => pano.lng });
    },
    event: {
      addListener: (_target: object, type: string, handler: () => void) => {
        handlers[type] = handler;
      },
    },
  } as unknown as KakaoMapsSdk;
  return { sdk, setViewpoint, setPanoId };
}

const request = {
  photo: { lat: 37.5509, lng: 126.941 },
  target: { lat: 37.5509, lng: 126.941 },
  radiusM: 50,
  heading: 90,
};

describe("showRoadview", () => {
  it("파노라마가 없으면 found false를 돌려준다", async () => {
    const { sdk } = fakeSdk(null);
    await expect(showRoadview(sdk, {} as HTMLElement, request)).resolves.toEqual({ found: false });
  });

  it("파노라마 위치에서 목표 지점을 바라보도록 시점을 맞춘다", async () => {
    const { sdk, setViewpoint } = fakeSdk(123);
    const result = await showRoadview(sdk, {} as HTMLElement, request);
    expect(result.found).toBe(true);
    expect(result.panoId).toBe("123");
    expect(result.panoDistanceM).toBeCloseTo(88, 0);
    expect(setViewpoint.mock.calls[0][0].pan).toBeCloseTo(90, 1);
  });

  it("방향 값이 없으면 시점을 바꾸지 않는다", async () => {
    const { sdk, setViewpoint } = fakeSdk(123);
    const result = await showRoadview(sdk, {} as HTMLElement, { ...request, heading: null });
    expect(setViewpoint).not.toHaveBeenCalled();
    expect(result.panDeg).toBeUndefined();
  });
});

describe("viewpointPan", () => {
  it("파노라마가 목표 지점과 겹치면 측정 방향을 쓴다", () => {
    const point = { lat: 37.5509, lng: 126.941 };
    expect(viewpointPan(point, point, 214.5)).toBe(214.5);
  });
});
