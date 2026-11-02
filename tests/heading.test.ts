import { describe, expect, it } from "vitest";
import { angleDiffDeg, cameraHeading, circularStats, toTrueNorth } from "../src/sensors/heading";

describe("cameraHeading", () => {
  it("세워 든 휴대폰의 후면 카메라 방향을 계산한다", () => {
    expect(cameraHeading(0, 90, 0)).toBeCloseTo(0, 5);
    expect(cameraHeading(90, 90, 0)).toBeCloseTo(270, 5);
    expect(cameraHeading(270, 90, 0)).toBeCloseTo(90, 5);
  });

  it("45도로 기울여도 같은 방향을 유지한다", () => {
    expect(cameraHeading(90, 45, 0)).toBeCloseTo(270, 5);
  });

  it("거의 바닥을 향하면 기기 윗방향을 쓴다", () => {
    expect(cameraHeading(90, 0, 0)).toBeCloseTo(270, 5);
    expect(cameraHeading(30, 5, 0)).toBeCloseTo(330, 5);
  });
});

describe("circularStats", () => {
  it("0도 경계를 넘는 평균을 계산한다", () => {
    const stats = circularStats([359, 1])!;
    expect(angleDiffDeg(stats.mean, 0)).toBeLessThan(1e-6);
    expect(stats.stdDev).toBeCloseTo(1, 2);
  });

  it("샘플이 없으면 null을 돌려준다", () => {
    expect(circularStats([])).toBeNull();
  });
});

describe("방향 변환", () => {
  it("자북을 진북으로 옮긴다", () => {
    expect(toTrueNorth(5)).toBeCloseTo(356.1, 5);
  });

  it("두 방향의 최소 차이를 계산한다", () => {
    expect(angleDiffDeg(350, 10)).toBe(20);
    expect(angleDiffDeg(90, 270)).toBe(180);
  });
});
