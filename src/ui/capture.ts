import { captureFrame, startCamera, stopCamera } from "../camera";
import { ACCURACY_LABEL, accuracyGrade } from "../geo";
import { LocationTracker } from "../sensors/location";
import { OrientationTracker, requestOrientationPermission } from "../sensors/orientation";
import { saveRecord } from "../storage/db";
import type { CaptureRecord } from "../types";
import { renderDetail } from "./detail";
import { detectPlatform, formatNumber } from "./format";
import { renderRecords } from "./records";
import type { Cleanup } from "./router";
import { show } from "./router";
import { getTester } from "./start";

export function renderCapture(root: HTMLElement): Cleanup {
  // iOS 권한 요청은 탭 직후 동기적으로 시작해야 한다.
  const permission = requestOrientationPermission();

  root.innerHTML = `
    <main class="camera">
      <video playsinline muted></video>
      <section class="hud">
        <div><span>위치</span><strong id="hud-location">대기 중</strong></div>
        <div><span>방향</span><strong id="hud-heading">대기 중</strong></div>
        <div><span>기울기</span><strong id="hud-tilt">-</strong></div>
        <div><span>안정도</span><strong id="hud-stability">-</strong></div>
      </section>
      <p id="camera-message" class="camera-message" hidden></p>
      <footer class="camera-actions">
        <button id="to-records">기록</button>
        <button id="shutter" class="shutter" aria-label="사진 촬영" disabled></button>
        <span></span>
      </footer>
    </main>`;

  const video = root.querySelector("video")!;
  const shutter = root.querySelector<HTMLButtonElement>("#shutter")!;
  const message = root.querySelector<HTMLElement>("#camera-message")!;
  const locationText = root.querySelector<HTMLElement>("#hud-location")!;
  const headingText = root.querySelector<HTMLElement>("#hud-heading")!;
  const tiltText = root.querySelector<HTMLElement>("#hud-tilt")!;
  const stabilityText = root.querySelector<HTMLElement>("#hud-stability")!;

  const locationTracker = new LocationTracker();
  const orientationTracker = new OrientationTracker();
  let stream: MediaStream | null = null;
  let closed = false;
  let orientationDenied = false;

  const showMessage = (text: string) => {
    message.textContent = text;
    message.hidden = false;
  };

  const updateHud = () => {
    const location = locationTracker.snapshot();
    const orientation = orientationTracker.snapshot();

    if (location) {
      const grade = accuracyGrade(location.accuracyM);
      locationText.textContent = `${ACCURACY_LABEL[grade]} ±${location.accuracyM.toFixed(0)}m`;
      locationText.dataset.grade = grade;
    } else {
      locationText.textContent = locationTracker.error ?? "대기 중";
      delete locationText.dataset.grade;
    }

    headingText.textContent =
      orientation.heading === null
        ? orientationDenied
          ? "권한 거부"
          : "대기 중"
        : formatNumber(orientation.heading, 0, "°");
    tiltText.textContent = formatNumber(orientation.beta, 0, "°");
    stabilityText.textContent = formatNumber(orientation.headingStdDev, 1, "°");
  };

  const timer = window.setInterval(updateHud, 250);

  const cleanup = () => {
    closed = true;
    window.clearInterval(timer);
    locationTracker.stop();
    orientationTracker.stop();
    stopCamera(stream);
  };

  void (async () => {
    orientationDenied = !(await permission);
    if (closed) return;
    orientationTracker.start();
    locationTracker.start();
    try {
      const started = await startCamera(video);
      if (closed) {
        stopCamera(started);
        return;
      }
      stream = started;
      shutter.disabled = false;
    } catch {
      showMessage("카메라를 시작하지 못했습니다. 브라우저의 카메라 권한을 확인하세요.");
    }
  })();

  shutter.addEventListener("click", async () => {
    shutter.disabled = true;
    const location = locationTracker.snapshot();
    const orientation = orientationTracker.snapshot();
    try {
      const record: CaptureRecord = {
        id: crypto.randomUUID(),
        photo: await captureFrame(video),
        capturedAt: new Date().toISOString(),
        tester: getTester(),
        device: { platform: detectPlatform(), userAgent: navigator.userAgent },
        location,
        orientation,
        streetView: {},
        review: {},
      };
      await saveRecord(record);
      show((next) => renderDetail(next, record.id));
    } catch {
      showMessage("사진을 저장하지 못했습니다. 다시 시도하세요.");
      shutter.disabled = false;
    }
  });

  root.querySelector("#to-records")!.addEventListener("click", () => show(renderRecords));

  return cleanup;
}
