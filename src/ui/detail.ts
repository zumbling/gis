import { ACCURACY_LABEL, accuracyGrade, bearingDeg, destination, distanceM, searchRadiusM } from "../geo";
import { angleDiffDeg, normalizeDeg } from "../sensors/heading";
import { deleteRecord, getRecord, saveRecord } from "../storage/db";
import { hasKakaoKey, loadKakao, showRoadview } from "../street-view/kakao";
import type { KakaoLatLng, KakaoMap, KakaoMapsSdk, KakaoMarker } from "../street-view/kakao-sdk";
import type { CaptureRecord, LatLng, RecordLocation, ViewMatch } from "../types";
import { formatNumber, formatTime } from "./format";
import { renderRecords } from "./records";
import type { Cleanup } from "./router";
import { show } from "./router";

const TARGET_DISTANCE_M = 4;
const FAN_LENGTH_M = 20;

export function renderDetail(root: HTMLElement, id: string): Cleanup {
  let closed = false;
  let photoUrl: string | null = null;

  root.innerHTML = `<main class="page"><p class="muted">불러오는 중입니다.</p></main>`;

  void getRecord(id).then((record) => {
    if (closed) return;
    if (!record) {
      show(renderRecords);
      return;
    }
    photoUrl = URL.createObjectURL(record.photo);
    fillDetail(root, record, photoUrl, () => closed);
  });

  return () => {
    closed = true;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  };
}

function metric(label: string, value: string): string {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

function fillDetail(root: HTMLElement, record: CaptureRecord, photoUrl: string, isClosed: () => boolean): void {
  const { location, orientation, review } = record;
  const grade = location ? accuracyGrade(location.accuracyM) : null;

  root.innerHTML = `
    <main class="page detail">
      <header class="topbar">
        <button id="back">목록</button>
        <h1>${formatTime(record.capturedAt)}</h1>
        <button id="delete" class="danger">삭제</button>
      </header>
      ${grade === "uncertain" ? `<p class="notice">위치 정확도가 낮습니다. 지도와 로드뷰가 다른 장소일 수 있습니다.</p>` : ""}
      <div class="grid">
        <figure><figcaption>촬영 사진</figcaption><img src="${photoUrl}" alt="촬영 사진" /></figure>
        <figure><figcaption>카카오 로드뷰</figcaption><div id="roadview" class="viewer"></div>
          <p id="roadview-status" class="muted small" role="status"></p></figure>
      </div>
      <dl class="metrics">
        ${metric("위치 정확도", location ? `${ACCURACY_LABEL[grade!]} ±${location.accuracyM.toFixed(1)}m` : "-")}
        ${metric("위치 나이", formatNumber(location ? location.fixAgeMs / 1000 : null, 1, "초"))}
        ${metric("방향(진북)", formatNumber(orientation.heading, 1, "°"))}
        ${metric("방향 안정도", formatNumber(orientation.headingStdDev, 1, "°"))}
        ${metric("기울기", `${formatNumber(orientation.beta, 0, "°")} / ${formatNumber(orientation.gamma, 0, "°")}`)}
        ${metric("방향 출처", orientation.headingSource)}
        ${metric("파노라마 거리", `<span id="pano-distance">-</span>`)}
      </dl>
      <section>
        <h2>지도</h2>
        <div id="map" class="viewer map"></div>
        <p id="map-status" class="muted small" role="status"></p>
      </section>
      <section class="review">
        <h2>평가</h2>
        <fieldset id="pin-mode">
          <legend>지도를 눌러 입력</legend>
          <label><input type="radio" name="pin" value="actual" checked /> 실제 위치</label>
          <label><input type="radio" name="pin" value="look" /> 바라본 지점</label>
        </fieldset>
        <label class="field">실제 카메라 방향 (°)
          <input id="actual-heading" type="number" inputmode="decimal" min="0" max="360" step="1" />
        </label>
        <label class="field">로드뷰 일치 여부
          <select id="view-match">
            <option value="">선택</option>
            <option value="match">일치</option>
            <option value="partial">일부 일치</option>
            <option value="mismatch">불일치</option>
            <option value="no-pano">파노라마 없음</option>
          </select>
        </label>
        <label class="field">메모
          <textarea id="memo" rows="2"></textarea>
        </label>
        <p id="review-result" class="muted small" role="status"></p>
        <button id="save" class="primary">평가 저장</button>
      </section>
    </main>`;

  const headingInput = root.querySelector<HTMLInputElement>("#actual-heading")!;
  const viewMatch = root.querySelector<HTMLSelectElement>("#view-match")!;
  const memo = root.querySelector<HTMLTextAreaElement>("#memo")!;
  const reviewResult = root.querySelector<HTMLElement>("#review-result")!;
  const mapStatus = root.querySelector<HTMLElement>("#map-status")!;
  const roadviewStatus = root.querySelector<HTMLElement>("#roadview-status")!;

  headingInput.value = review.actualHeading?.toString() ?? "";
  viewMatch.value = review.viewMatch ?? "";
  memo.value = review.memo ?? "";

  let actual: LatLng | null =
    review.actualLat !== undefined && review.actualLng !== undefined
      ? { lat: review.actualLat, lng: review.actualLng }
      : null;

  const describeReview = () => {
    const parts = [];
    if (record.review.gpsErrorM !== undefined) parts.push(`GPS 오차 ${record.review.gpsErrorM.toFixed(1)}m`);
    if (record.review.headingErrorDeg !== undefined) parts.push(`방향 오차 ${record.review.headingErrorDeg.toFixed(1)}°`);
    reviewResult.textContent = parts.join(" · ");
  };
  describeReview();

  root.querySelector("#back")!.addEventListener("click", () => show(renderRecords));
  root.querySelector("#delete")!.addEventListener("click", async () => {
    if (!window.confirm("이 촬영 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
    await deleteRecord(record.id);
    show(renderRecords);
  });

  root.querySelector("#save")!.addEventListener("click", async () => {
    const heading = headingInput.value === "" ? undefined : normalizeDeg(Number(headingInput.value));
    record.review = {
      ...(actual ? { actualLat: actual.lat, actualLng: actual.lng } : {}),
      ...(heading !== undefined ? { actualHeading: heading } : {}),
      ...(actual && location ? { gpsErrorM: distanceM(location, actual) } : {}),
      ...(heading !== undefined && orientation.heading !== null
        ? { headingErrorDeg: angleDiffDeg(orientation.heading, heading) }
        : {}),
      ...(viewMatch.value ? { viewMatch: viewMatch.value as ViewMatch } : {}),
      ...(memo.value.trim() ? { memo: memo.value.trim() } : {}),
    };
    await saveRecord(record);
    describeReview();
    reviewResult.textContent = `저장했습니다. ${reviewResult.textContent}`.trim();
  });

  if (!location) {
    mapStatus.textContent = "위치가 없는 기록이라 지도와 로드뷰를 표시하지 않습니다.";
    roadviewStatus.textContent = "위치 없음";
    return;
  }
  if (!hasKakaoKey()) {
    mapStatus.textContent = "카카오 키가 없어 지도를 표시하지 않습니다.";
    roadviewStatus.textContent = "카카오 키 없음";
    return;
  }

  const target =
    orientation.heading === null ? location : destination(location, orientation.heading, TARGET_DISTANCE_M);

  void (async () => {
    let sdk: KakaoMapsSdk;
    try {
      sdk = await loadKakao();
    } catch (error) {
      mapStatus.textContent = (error as Error).message;
      roadviewStatus.textContent = "표시할 수 없습니다.";
      return;
    }
    if (isClosed()) return;

    const toKakao = (point: LatLng) => new sdk.LatLng(point.lat, point.lng);
    const fromKakao = (point: KakaoLatLng): LatLng => ({ lat: point.getLat(), lng: point.getLng() });

    const map = new sdk.Map(root.querySelector<HTMLElement>("#map")!, { center: toKakao(location), level: 2 });
    drawCapture(sdk, map, location, orientation.heading, orientation.headingStdDev);

    let actualMarker: KakaoMarker | null = null;
    let lookMarker: KakaoMarker | null = null;

    const placeActual = (point: LatLng) => {
      actual = point;
      if (actualMarker) {
        actualMarker.setPosition(toKakao(point));
        return;
      }
      actualMarker = new sdk.Marker({ position: toKakao(point), map, title: "실제 위치", draggable: true });
      sdk.event.addListener(actualMarker, "dragend", () => {
        actual = fromKakao(actualMarker!.getPosition());
      });
    };

    const placeLook = (point: LatLng) => {
      if (lookMarker) lookMarker.setPosition(toKakao(point));
      else lookMarker = new sdk.Marker({ position: toKakao(point), map, title: "바라본 지점" });
      headingInput.value = bearingDeg(actual ?? location, point).toFixed(0);
    };

    if (actual) placeActual(actual);

    sdk.event.addListener(map, "click", (event) => {
      const mode = root.querySelector<HTMLInputElement>('input[name="pin"]:checked')!.value;
      if (mode === "actual") placeActual(fromKakao(event.latLng));
      else placeLook(fromKakao(event.latLng));
    });

    roadviewStatus.textContent = "로드뷰를 찾는 중입니다.";
    try {
      const result = await showRoadview(sdk, root.querySelector<HTMLElement>("#roadview")!, {
        photo: location,
        target,
        radiusM: searchRadiusM(location.accuracyM),
        heading: orientation.heading,
      });
      if (isClosed()) return;
      record.streetView.kakao = result;
      await saveRecord(record);

      if (!result.found) {
        roadviewStatus.textContent = "근처에 파노라마가 없습니다.";
        if (!viewMatch.value) viewMatch.value = "no-pano";
        return;
      }

      roadviewStatus.textContent = `시점 ${formatNumber(result.panDeg, 0, "°")}`;
      root.querySelector("#pano-distance")!.textContent = formatNumber(result.panoDistanceM, 1, "m");

      const pano = { lat: result.panoLat!, lng: result.panoLng! };
      drawPano(sdk, map, pano, target);
      const bounds = new sdk.LatLngBounds();
      bounds.extend(toKakao(location));
      bounds.extend(toKakao(pano));
      map.setBounds(bounds);
    } catch (error) {
      if (!isClosed()) roadviewStatus.textContent = (error as Error).message;
    }
  })();
}

function drawCapture(
  sdk: KakaoMapsSdk,
  map: KakaoMap,
  location: RecordLocation,
  heading: number | null,
  stdDev: number | null,
): void {
  const center = new sdk.LatLng(location.lat, location.lng);
  new sdk.Marker({ position: center, map, title: "촬영 위치" });
  new sdk.Circle({
    map,
    center,
    radius: location.accuracyM,
    strokeWeight: 1,
    strokeColor: "#2563eb",
    strokeOpacity: 0.8,
    fillColor: "#2563eb",
    fillOpacity: 0.12,
  });

  if (heading === null) return;
  const spread = Math.min(45, Math.max(15, (stdDev ?? 0) * 2));
  const path = [center];
  for (let step = 0; step <= 8; step += 1) {
    const point = destination(location, heading - spread + (spread * step) / 4, FAN_LENGTH_M);
    path.push(new sdk.LatLng(point.lat, point.lng));
  }
  new sdk.Polygon({
    map,
    path,
    strokeWeight: 1,
    strokeColor: "#f97316",
    fillColor: "#f97316",
    fillOpacity: 0.3,
  });
}

function drawPano(sdk: KakaoMapsSdk, map: KakaoMap, pano: LatLng, target: LatLng): void {
  const center = new sdk.LatLng(pano.lat, pano.lng);
  new sdk.Circle({
    map,
    center,
    radius: 2,
    strokeWeight: 2,
    strokeColor: "#7c3aed",
    fillColor: "#7c3aed",
    fillOpacity: 0.9,
  });
  new sdk.Polyline({
    map,
    path: [center, new sdk.LatLng(target.lat, target.lng)],
    strokeWeight: 2,
    strokeColor: "#7c3aed",
    strokeStyle: "shortdash",
  });
}
