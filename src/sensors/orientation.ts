import type { HeadingSource, RecordOrientation } from "../types";
import { cameraHeading, circularStats, toTrueNorth } from "./heading";

const WINDOW_MS = 1500;

interface Sample {
  at: number;
  heading: number;
  source: HeadingSource;
  beta: number | null;
  gamma: number | null;
  compassAccuracy: number | null;
}

interface IOSOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

interface OrientationEventWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

// iOS 는 사용자 탭 안에서 호출해야 하므로 이 함수보다 앞에 await 를 두지 않는다.
export async function requestOrientationPermission(): Promise<boolean> {
  const request = (window.DeviceOrientationEvent as unknown as OrientationEventWithPermission | undefined)
    ?.requestPermission;
  if (!request) return true;
  try {
    return (await request.call(window.DeviceOrientationEvent)) === "granted";
  } catch {
    return false;
  }
}

export class OrientationTracker {
  private samples: Sample[] = [];
  private seenAbsolute = false;

  private onAbsolute = (event: DeviceOrientationEvent) => {
    if (event.alpha === null || event.beta === null || event.gamma === null) return;
    this.seenAbsolute = true;
    this.push({
      heading: cameraHeading(event.alpha, event.beta, event.gamma),
      source: "android-absolute",
      beta: event.beta,
      gamma: event.gamma,
      compassAccuracy: null,
    });
  };

  private onOrientation = (event: DeviceOrientationEvent) => {
    const ios = event as IOSOrientationEvent;
    if (typeof ios.webkitCompassHeading === "number") {
      const accuracy = ios.webkitCompassAccuracy;
      this.push({
        heading: ios.webkitCompassHeading,
        source: "ios-webkit",
        beta: event.beta,
        gamma: event.gamma,
        compassAccuracy: typeof accuracy === "number" && accuracy >= 0 ? accuracy : null,
      });
    } else if (event.absolute && !this.seenAbsolute) {
      this.onAbsolute(event);
    }
  };

  private push(sample: Omit<Sample, "at">): void {
    const at = Date.now();
    this.samples = this.samples.filter((item) => at - item.at <= WINDOW_MS);
    this.samples.push({ ...sample, at });
  }

  start(): void {
    window.addEventListener("deviceorientationabsolute", this.onAbsolute as EventListener);
    window.addEventListener("deviceorientation", this.onOrientation);
  }

  stop(): void {
    window.removeEventListener("deviceorientationabsolute", this.onAbsolute as EventListener);
    window.removeEventListener("deviceorientation", this.onOrientation);
    this.samples = [];
    this.seenAbsolute = false;
  }

  snapshot(now = Date.now()): RecordOrientation {
    const samples = this.samples.filter((item) => now - item.at <= WINDOW_MS);
    const stats = circularStats(samples.map((item) => item.heading));
    const last = samples.at(-1);
    return {
      rawHeading: stats ? stats.mean : null,
      heading: stats ? toTrueNorth(stats.mean) : null,
      headingSource: last?.source ?? "unavailable",
      headingStdDev: stats ? stats.stdDev : null,
      compassAccuracy: last?.compassAccuracy ?? null,
      beta: last?.beta ?? null,
      gamma: last?.gamma ?? null,
      screenAngle: screen.orientation?.angle ?? null,
    };
  }
}
