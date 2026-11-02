import { hasKakaoKey } from "../street-view/kakao";
import { renderCapture } from "./capture";
import { renderRecords } from "./records";
import { show } from "./router";

const TESTER_KEY = "gis.tester";

export function getTester(): string {
  try {
    return localStorage.getItem(TESTER_KEY) ?? "";
  } catch {
    return "";
  }
}

function setTester(name: string): void {
  try {
    localStorage.setItem(TESTER_KEY, name);
  } catch {
    // 저장이 막힌 브라우저에서는 이번 접속 동안만 입력값을 쓴다.
  }
}

export function renderStart(root: HTMLElement): void {
  root.innerHTML = `
    <main class="page narrow">
      <h1>점블 현장 촬영</h1>
      <p class="muted">사진과 위치, 방향을 기록하고 카카오 로드뷰와 비교합니다.</p>
      <label class="field">테스터 이름
        <input id="tester" autocomplete="name" placeholder="예: 수임" />
      </label>
      <div id="notices"></div>
      <button id="start" class="primary">테스트 시작</button>
      <button id="records">촬영 기록 보기</button>
      <p class="muted small">시작하면 카메라, 위치, 방향 센서 권한을 요청합니다. 사진과 기록은 이 기기에만 저장됩니다.</p>
    </main>`;

  const tester = root.querySelector<HTMLInputElement>("#tester")!;
  tester.value = getTester();

  const notices: string[] = [];
  if (!window.isSecureContext) notices.push("HTTPS 주소가 아니어서 카메라와 센서를 쓸 수 없습니다.");
  if (!hasKakaoKey()) notices.push("카카오 키가 없어 지도와 로드뷰가 표시되지 않습니다.");
  root.querySelector("#notices")!.replaceChildren(
    ...notices.map((text) => {
      const notice = document.createElement("p");
      notice.className = "notice";
      notice.textContent = text;
      return notice;
    }),
  );

  root.querySelector("#start")!.addEventListener("click", () => {
    setTester(tester.value.trim());
    show(renderCapture);
  });
  root.querySelector("#records")!.addEventListener("click", () => show(renderRecords));
}
