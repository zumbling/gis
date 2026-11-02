# 촬영·위치·거리뷰 확인 웹 프로토타입 개발 계획 (초안)

> 작성일: 2026-11-02
> 상태: 초안. 임계값과 일정은 제안값이며 첫 현장 테스트 뒤 조정한다.
> 1차 구현은 카카오 로드뷰만 사용한다. 네이버 파노라마 비교는 제외했다.

## 1. 목적

스마트폰 웹에서 사진을 찍고, 촬영 위치·위치 정확도·카메라 방향을 함께 기록한 뒤, 같은 지점과 방향의 거리뷰를 보여 주는 기능 확인용 웹을 만든다.

연구 계획서의 4단계(영상 수집 → 인식 → 설치 오류 판정 → 공간정보 저장·지도 시각화) 중 **영상 수집과 공간정보**를 먼저 검증한다. `jwanbeengucci`와 `dm`에는 해당 기능이 없고, 현재 진행 중인 라벨링 작업과도 겹치지 않는다.

이 프로토타입의 핵심은 거리뷰 화면 자체가 아니라 다음 질문에 측정값으로 답하는 것이다.

| # | 검증 질문 | 확인할 값 |
|---|---|---|
| Q1 | 보도에서 위치 오차는 어느 정도이고, `accuracy` 값을 믿을 수 있는가? | `accuracyM`, `gpsErrorM` |
| Q2 | 바닥을 향해 휴대폰을 기울여도 방향 값을 쓸 수 있는가? | `headingErrorDeg`, `beta`, `gamma` |
| Q3 | iOS와 Android의 차이는 얼마나 큰가? | 플랫폼별 Q1·Q2 결과 |
| Q4 | 촬영 지점 근처에 파노라마가 있는가? | 파노라마 유무, `panoDistanceM` |
| Q5 | 거리뷰가 실제 촬영 장면과 맞는가? | `viewMatch` |

## 2. 범위

### 포함

- 웹 카메라 미리보기와 촬영
- 위치·방향 연속 수집, 현재 센서 상태 표시
- 촬영 시 사진과 측정값 저장
- 지도에 위치, 정확도 반경, 방향 부채꼴 표시
- 카카오 로드뷰 표시
- 실제 위치 핀, 실제 방향 입력, 거리뷰 일치 여부 평가
- 촬영 기록 목록, JSON·사진 내보내기

### 제외

- 점자블록 모델 추론, 설치 오류 판정
- 서버, 로그인, 공용 DB
- 정상/의심/불명확 지점 대시보드
- 동영상 촬영, 프레임 처리
- 동일 지점 통합
- 네이버 파노라마 연동
- 거리뷰 이미지 저장, 캡처, 학습 활용

## 3. 사용 흐름

1. 테스터가 HTTPS 주소로 접속하고 **테스트 시작**을 누른다.
2. 카메라, 위치, 방향 센서 권한을 요청한다. iOS 방향 센서 권한은 이 탭 핸들러 안에서 요청한다.
3. 카메라 화면에 위치 정확도, 방향, 기울기, 방향 안정도를 표시한다.
4. 촬영 버튼을 누르면 사진과 셔터 시점의 측정값을 저장한다.
5. 결과 화면에서 사진, 지도, 거리뷰를 함께 확인한다.
6. 테스터가 실제 위치 핀을 놓고, 실제 카메라 방향과 거리뷰 일치 여부를 입력한다.
7. 테스트가 끝나면 전체 기록을 내보낸다.

## 4. 기술 구성

| 구분 | 선택 | 이유 |
|---|---|---|
| 프런트엔드 | Vite + TypeScript | 서버 없이 빠르게 배포 가능 |
| 카메라 | `getUserMedia` + `<canvas>` | 촬영 중 페이지를 벗어나지 않아 센서 수집 유지 |
| 위치 | Geolocation API `watchPosition` | `accuracy` 제공 |
| 방향 | Device Orientation API | iOS `webkitCompassHeading`, Android `deviceorientationabsolute` |
| 저장 | IndexedDB | 서버 없이 사진 Blob과 기록을 기기에 저장 |
| 배포 | Vercel 등 HTTPS 정적 호스팅 | 센서·카메라 접근과 휴대폰 테스트에 필요 |
| 내보내기 | ZIP (`records.json` + 사진) | 테스트 후 일괄 분석 |

### 제안 폴더 구조

```text
capture-web/
├── src/
│   ├── main.ts
│   ├── app/                화면 전환, 상태 관리
│   ├── camera/             카메라 시작, 프레임 캡처
│   ├── sensors/
│   │   ├── location.ts     위치 수집, 셔터 시점 값 선택
│   │   ├── orientation.ts  플랫폼별 방향 수집
│   │   └── heading.ts      방향 계산, 원형 평균, 표준편차
│   ├── geo/                목표 지점, 방위각, 거리 계산
│   ├── street-view/        카카오 지도·로드뷰
│   └── storage/            IndexedDB, ZIP 내보내기
├── tests/                  geo, heading 단위 테스트
├── .env.example
└── README.md
```

## 5. 센서 처리

### 위치

```ts
navigator.geolocation.watchPosition(onPosition, onError, {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15000,
});
```

- 최근 10초의 위치를 메모리에 보관한다.
- 셔터 시점에는 최근 5초 안의 값 중 `accuracy`가 가장 작은 값을 쓴다.
- 해당 값이 얼마나 오래됐는지 `fixAgeMs`로 저장한다.
- `coords.heading`은 이동 방향이므로 카메라 방향으로 쓰지 않는다.

제안 표시 기준:

| `accuracyM` | 표시 |
|---|---|
| 15m 이하 | 양호 |
| 15m 초과 30m 이하 | 주의 |
| 30m 초과 | 위치 불명확 |

### 방향

- iOS: `DeviceOrientationEvent.requestPermission()` 후 `webkitCompassHeading`, `webkitCompassAccuracy`, `beta`, `gamma`를 받는다.
- Android: `deviceorientationabsolute`의 `alpha`, `beta`, `gamma`로 후면 카메라 방향을 계산한다.
- 절대 방향 이벤트가 없는 기기는 `headingSource: "unavailable"`로 기록하고, 위치와 지도 기능만 진행한다.

```ts
const toRad = Math.PI / 180;

export function cameraHeading(alpha: number, beta: number, gamma: number): number {
  const a = alpha * toRad;
  const b = beta * toRad;
  const g = gamma * toRad;

  const x = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
  const y = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);

  // 거의 바닥을 향하면 수평 성분이 작아져 기기 윗방향을 사용한다.
  if (Math.hypot(x, y) < 0.35) return (360 - alpha) % 360;

  return (Math.atan2(x, y) / toRad + 360) % 360;
}
```

- 최근 1.5초 값을 원형 평균해 `heading`으로 저장한다.
- 같은 구간의 원형 표준편차를 `headingStdDev`로 저장한다.
- 나침반 원시값과 진북 보정값을 함께 저장한다.
- 자편각은 위치 기준 공개 값으로 계산하거나, 프로토타입에서는 서울 기준 상수로 시작한다.

## 6. 거리뷰 처리

휴대폰 위치와 파노라마 위치가 다르므로 측정한 방향을 그대로 넣지 않는다.

```text
휴대폰 위치 + 측정 방향 + 4m
  → 바라보는 목표 지점 계산
  → 가장 가까운 파노라마 검색
  → 파노라마 위치에서 목표 지점까지의 방위각 계산
  → 거리뷰 시점 설정
```

- 검색 반경: `max(50, accuracyM × 2)`m, 최대 100m
- 파노라마가 없으면 지도와 측정값만 표시하고 `panoFound: false`로 기록
- 위치 정확도가 낮으면 거리뷰 위에 "위치 불명확" 경고 표시

카카오 API 사용 범위:

| 항목 | 사용 API |
|---|---|
| 파노라마 찾기 | `RoadviewClient.getNearestPanoId` |
| 파노라마 표시 | `Roadview.setPanoId` |
| 시점 설정 | `Roadview.setViewpoint` |
| 사전 준비 | JavaScript 키, 접속 도메인 등록 |

구현 시 공식 문서에서 다시 확인할 항목:

- `Roadview.getPosition`이 파노라마 실제 좌표를 돌려주는지
- `pan`, `tilt` 범위와 부호
- 무료 사용량
- 지도와 로고 표시 의무

## 7. 데이터 형식

`records.json`의 기록 1건:

```json
{
  "id": "uuid",
  "photoFile": "photos/uuid.jpg",
  "capturedAt": "2026-11-02T10:30:00+09:00",
  "device": { "platform": "ios", "userAgent": "..." },
  "location": {
    "lat": 37.5509,
    "lng": 126.941,
    "accuracyM": 12.4,
    "fixAgeMs": 800
  },
  "orientation": {
    "rawHeading": 222.8,
    "heading": 214.5,
    "headingSource": "ios-webkit",
    "headingStdDev": 3.2,
    "compassAccuracy": 10,
    "beta": 48.1,
    "gamma": -2.3
  },
  "streetView": {
    "kakao": {
      "found": true,
      "panoId": "...",
      "panoLat": 37.55085,
      "panoLng": 126.94092,
      "panoDistanceM": 8.7,
      "panDeg": 208.2
    }
  },
  "review": {
    "actualLat": 37.55092,
    "actualLng": 126.94108,
    "actualHeading": 205,
    "gpsErrorM": 7.8,
    "headingErrorDeg": 9.5,
    "viewMatch": "partial",
    "memo": "건물 옆"
  }
}
```

`viewMatch` 값:

| 값 | 의미 |
|---|---|
| `match` | 같은 장소와 비슷한 방향 |
| `partial` | 장소는 맞지만 방향이나 시야가 다름 |
| `mismatch` | 다른 장소 또는 방향 |
| `no-pano` | 파노라마 없음 |

실제 위치와 방향은 테스터 입력값이므로 측량 수준의 정답이 아니라 기준값으로 취급한다.

## 8. 개발 단계

### M0. 기본 준비

- Vite 프로젝트 생성, HTTPS 배포
- 카카오 키 발급 및 배포 도메인 등록
- 환경 변수와 실행 방법 정리

### M1. 센서 확인 화면

- 카메라 미리보기
- 위치·방향 실시간 표시
- 권한 거부 및 미지원 안내
- iPhone 1대, Android 1대에서 동작 확인

### M2. 촬영과 저장

- 사진과 측정값 저장
- IndexedDB 기록 목록
- 기록 상세 보기, ZIP 내보내기

### M3. 지도와 거리뷰

- 지도 표시
- 목표 지점·방위각 계산
- 카카오 로드뷰 연동

### M4. 현장 테스트

- 평가 입력 화면
- 실제 환경 테스트
- 분석표와 결과 정리

## 9. 제안 일정

| 기간 | 내용 |
|---|---|
| 11/2 ~ 11/6 | M0, M1, M2 |
| 11/7 ~ 11/10 | M3 |
| 11/11 ~ 11/13 | M4 현장 테스트 |
| 11/14 ~ 11/16 | 분석, 2차 범위 결정 |

연구 수행 기간은 12/14까지이므로, 11월 중순까지 결과를 내면 이후 모델 연동과 지도 대시보드에 시간을 쓸 수 있다.

## 10. 현장 테스트 계획

- 대상: 팀원 4명의 휴대폰. iOS와 Android를 모두 포함한다.
- 분량: 1인당 20지점, 총 80건 내외
- 장소 유형: 개방된 보도, 고층 건물 옆, 골목, 횡단보도·계단 주변
- 촬영 방식: 지점마다 평소 촬영 자세로 1회 이상 촬영한다.
- 방향 기준: 지도 위 대상 지점이나 도로 방향을 이용해 실제 방향을 입력한다.

### 1차 판단 기준

| 항목 | 기준 |
|---|---|
| 위치 | `gpsErrorM` 중앙값 15m 이하 |
| 방향 | `headingErrorDeg` 중앙값 20° 이하 |
| 커버리지 | 지점 80% 이상에서 파노라마 확인 |
| 거리뷰 | `match + partial` 70% 이상 |
| 기능 | iOS와 Android에서 전체 흐름 완료 |

기준은 사전 합의용 제안값이다. 미달하더라도 원인 유형(건물, 기기, 기울기, 파노라마 없음)을 구분해 다음 설계에 반영한다.

## 11. 위험과 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| 나침반 오차 | 거리뷰 방향 불일치 | 안정도 표시, 오차 측정, 필요 시 지도 방향 수정 입력 추가 |
| iOS 기울기 동작 불명확 | 플랫폼 간 차이 발생 | `beta`, `gamma` 저장, 각도별 비교 시험 |
| 고층 건물 주변 GPS 오차 | 다른 위치 표시 | 정확도 기준 표시, 위치 불명확 처리 |
| 파노라마 없음 또는 오래된 이미지 | 현장 확인 불가 | 사진과 지도 중심으로 처리, 커버리지 측정 |
| 거리뷰 약관 제한 | 저장·학습 불가 | 실시간 표시만 사용, 학습 데이터는 팀 촬영본 사용 |
| 사진 내 개인정보 | 얼굴·차량번호 노출 | 공개 저장소에 올리지 않고 팀 내부 저장소에서 관리 |
| 브라우저 권한 차이 | 테스트 중 기능 실패 | 시작 화면에 권한 상태와 재시도 안내 표시 |

## 12. 2차 단계 후보

결과가 확인되면 다음 순서로 확장한다.

1. `3_train/runs/blocktype/best.pt` 또는 재학습 모델을 추론 API로 연결
2. 촬영 사진에 분할 결과와 판정 근거 표시
3. 공용 저장소 연결. `dm`의 Google Drive + Apps Script 구조 재사용 검토
4. 정상/의심/불명확 지도 대시보드
5. 거리·시간·방향을 이용한 동일 지점 통합

## 13. 결정이 필요한 사항

- [ ] 카카오 계정과 API 키 관리 담당자
- [ ] 현장 테스트 장소
- [ ] 촬영 사진의 팀 내부 저장 위치와 보관 기간
- [ ] 1차 판단 기준 확정
