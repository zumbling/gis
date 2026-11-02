import { describe, expect, it } from "vitest";
import { pickFix } from "../src/sensors/location";

const fix = (at: number, accuracyM: number) => ({ lat: 37, lng: 127, accuracyM, at });

describe("pickFix", () => {
  it("최근 값 중 정확도가 가장 좋은 값을 고른다", () => {
    expect(pickFix([fix(1000, 20), fix(4000, 8), fix(5000, 12)], 5000)?.accuracyM).toBe(8);
  });

  it("정확도가 같으면 더 최근 값을 고른다", () => {
    expect(pickFix([fix(1000, 12), fix(5000, 12)], 5000)?.at).toBe(5000);
  });

  it("오래된 값은 정확도가 좋아도 고르지 않는다", () => {
    expect(pickFix([fix(0, 3), fix(9000, 25)], 10000)?.accuracyM).toBe(25);
  });

  it("최근 값이 없으면 가장 최근 값을 쓴다", () => {
    expect(pickFix([fix(0, 3), fix(1000, 25)], 60000)?.accuracyM).toBe(25);
  });

  it("값이 없으면 null을 돌려준다", () => {
    expect(pickFix([], 0)).toBeNull();
  });
});
