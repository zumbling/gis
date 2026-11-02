const toRad = Math.PI / 180;
const toDeg = 180 / Math.PI;

// 서울 기준 근사값. 나침반(자북)을 지도(진북) 기준으로 옮길 때 더한다.
export const MAGNETIC_DECLINATION_DEG = -8.9;

export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function toTrueNorth(magneticDeg: number): number {
  return normalizeDeg(magneticDeg + MAGNETIC_DECLINATION_DEG);
}

// W3C 회전 행렬(Z-X'-Y'')에서 후면 카메라(-z) 방향을 수평면에 투영한 값
export function cameraHeading(alpha: number, beta: number, gamma: number): number {
  const a = alpha * toRad;
  const b = beta * toRad;
  const g = gamma * toRad;
  const east = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
  const north = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);

  // 거의 바닥을 향하면 수평 성분이 작아져 기기 윗방향을 사용한다.
  if (Math.hypot(east, north) < 0.35) {
    return normalizeDeg(Math.atan2(-Math.sin(a) * Math.cos(b), Math.cos(a) * Math.cos(b)) * toDeg);
  }
  return normalizeDeg(Math.atan2(east, north) * toDeg);
}

export function circularStats(degrees: number[]): { mean: number; stdDev: number } | null {
  if (degrees.length === 0) return null;
  let sin = 0;
  let cos = 0;
  for (const deg of degrees) {
    sin += Math.sin(deg * toRad);
    cos += Math.cos(deg * toRad);
  }
  const resultant = Math.min(1, Math.hypot(sin, cos) / degrees.length);
  const stdDev = resultant <= 0 ? 180 : Math.sqrt(-2 * Math.log(resultant)) * toDeg;
  return { mean: normalizeDeg(Math.atan2(sin, cos) * toDeg), stdDev };
}

export function angleDiffDeg(a: number, b: number): number {
  const diff = Math.abs(normalizeDeg(a) - normalizeDeg(b));
  return diff > 180 ? 360 - diff : diff;
}
