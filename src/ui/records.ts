import { ACCURACY_LABEL, accuracyGrade } from "../geo";
import { listRecords } from "../storage/db";
import { exportRecords } from "../storage/export";
import { renderCapture } from "./capture";
import { renderDetail } from "./detail";
import { escapeHtml, formatNumber, formatTime } from "./format";
import type { Cleanup } from "./router";
import { show } from "./router";
import { renderStart } from "./start";

export function renderRecords(root: HTMLElement): Cleanup {
  root.innerHTML = `
    <main class="page">
      <header class="topbar">
        <button id="home">처음</button>
        <h1>촬영 기록</h1>
        <button id="capture" class="primary">촬영</button>
      </header>
      <button id="export" disabled>전체 내보내기 (ZIP)</button>
      <p id="export-status" class="muted small" role="status"></p>
      <ul id="list" class="records"></ul>
    </main>`;

  const urls: string[] = [];
  const list = root.querySelector<HTMLElement>("#list")!;
  const exportButton = root.querySelector<HTMLButtonElement>("#export")!;
  const status = root.querySelector<HTMLElement>("#export-status")!;

  root.querySelector("#home")!.addEventListener("click", () => show(renderStart));
  root.querySelector("#capture")!.addEventListener("click", () => show(renderCapture));

  void listRecords().then((records) => {
    exportButton.disabled = records.length === 0;
    exportButton.addEventListener("click", async () => {
      exportButton.disabled = true;
      status.textContent = "내보내는 중입니다.";
      try {
        await exportRecords(records);
        status.textContent = `${records.length}건을 내보냈습니다.`;
      } catch {
        status.textContent = "내보내지 못했습니다.";
      }
      exportButton.disabled = false;
    });

    if (records.length === 0) {
      list.innerHTML = `<li class="muted">아직 촬영 기록이 없습니다.</li>`;
      return;
    }

    for (const record of records) {
      const url = URL.createObjectURL(record.photo);
      urls.push(url);
      const grade = record.location ? accuracyGrade(record.location.accuracyM) : null;
      const item = document.createElement("li");
      item.innerHTML = `
        <button class="record">
          <img src="${url}" alt="" />
          <span>
            <strong>${formatTime(record.capturedAt)}</strong>
            <small>${escapeHtml(record.tester || "테스터 미입력")}</small>
            <small>
              ${grade ? `${ACCURACY_LABEL[grade]} ±${record.location!.accuracyM.toFixed(0)}m` : "위치 없음"}
              · ${formatNumber(record.orientation.heading, 0, "°")}
              · ${record.review.viewMatch ? "평가 완료" : "평가 전"}
            </small>
          </span>
        </button>`;
      item.querySelector("button")!.addEventListener("click", () => {
        show((next) => renderDetail(next, record.id));
      });
      list.append(item);
    }
  });

  return () => urls.forEach((url) => URL.revokeObjectURL(url));
}
