import { describe, expect, it } from "vitest";
import { accuracyGrade, bearingDeg, destination, distanceM, searchRadiusM } from "../src/geo";

const origin = { lat: 37.5509, lng: 126.941 };

describe("geo", () => {
  it("목표 지점까지의 거리와 방위각이 입력과 일치한다", () => {
    for (const bearing of [0, 45, 90, 214.5, 359]) {
      const target = destination(origin, bearing, 4);
      expect(distanceM(origin, target)).toBeCloseTo(4, 3);
      expect(bearingDeg(origin, target)).toBeCloseTo(bearing, 1);
    }
  });

  it("기본 방위각을 계산한다", () => {
    expect(bearingDeg(origin, { lat: 37.56, lng: 126.941 })).toBeCloseTo(0, 5);
    expect(bearingDeg(origin, { lat: 37.5509, lng: 126.95 })).toBeCloseTo(90, 1);
  });

  it("검색 반경은 50~100m로 제한한다", () => {
    expect(searchRadiusM(5)).toBe(50);
    expect(searchRadiusM(35)).toBe(70);
    expect(searchRadiusM(300)).toBe(100);
  });

  it("정확도 등급을 나눈다", () => {
    expect(accuracyGrade(15)).toBe("good");
    expect(accuracyGrade(30)).toBe("caution");
    expect(accuracyGrade(30.1)).toBe("uncertain");
  });
});
