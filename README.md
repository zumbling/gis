# gis — 현장 촬영·위치·로드뷰 확인 웹

스마트폰 웹에서 사진을 찍고 위치 정확도와 카메라 방향을 기록한 뒤, 같은 지점과 방향의 카카오 로드뷰와 비교하는 기능 확인용 프로토타입입니다.
사진과 기록은 기기의 IndexedDB에 저장하며 서버는 없습니다. 개발 계획은 [docs/PROTOTYPE_PLAN.md](docs/PROTOTYPE_PLAN.md)를 보세요.

## 실행

```bash
npm install
cp .env.example .env.local   # VITE_KAKAO_JS_KEY 입력
npm run dev                  # http://localhost:5173
```

```bash
npm test         # 단위 테스트
npm run build    # 타입 검사 + 배포 파일 생성 (dist/)
```

## 카카오 설정

1. [Kakao Developers](https://developers.kakao.com)에서 앱을 만들고 JavaScript 키를 복사합니다.
2. 앱의 플랫폼 설정에서 Web 도메인을 등록합니다. 예: `http://localhost:5173`, 배포 주소
3. 앱에서 카카오맵 서비스 사용 설정이 필요한지 콘솔에서 확인합니다.

JavaScript 키는 빌드 결과에 포함되어 브라우저에 노출됩니다. 그래서 도메인 제한이 사용 범위를 막는 수단이며, `.env.local`은 커밋하지 않습니다.

## 휴대폰에서 테스트

카메라와 센서는 HTTPS에서만 동작하므로 `dist/`를 HTTPS 정적 호스팅(Vercel 등)에 배포합니다.

- 빌드 명령 `npm run build`, 출력 폴더 `dist`
- 호스팅 환경 변수에 `VITE_KAKAO_JS_KEY` 등록
- 배포 주소를 카카오 앱의 Web 도메인에 등록

## 사용 순서

1. 테스터 이름을 입력하고 **테스트 시작**을 누른 뒤 카메라, 위치, 방향 권한을 허용합니다.
2. 위쪽의 위치 정확도와 방향 안정도를 보고 촬영합니다.
3. 결과 화면에서 사진과 로드뷰를 비교합니다.
4. 지도에서 실제 위치와 바라본 지점을 찍고, 일치 여부를 골라 **평가 저장**을 누릅니다.
5. 촬영 기록에서 **전체 내보내기**로 `records.json`과 사진 ZIP을 받습니다.

## 측정값

| 값 | 의미 |
|---|---|
| `location.accuracyM` | 브라우저가 알려 준 위치 오차 반경(m) |
| `location.fixAgeMs` | 사용한 위치 값이 셔터 시점보다 얼마나 오래됐는지 |
| `orientation.rawHeading` | 원형 평균한 나침반 값(자북) |
| `orientation.heading` | 진북 기준 카메라 방향. 서울 근사 자편각 -8.9° 적용 |
| `orientation.headingStdDev` | 최근 1.5초 방향의 흔들림 |
| `streetView.kakao.panoDistanceM` | 촬영 위치와 파노라마의 거리 |
| `review.gpsErrorM` | 기록 위치와 입력한 실제 위치의 거리 |
| `review.headingErrorDeg` | 측정 방향과 입력한 실제 방향의 차이 |

로드뷰는 실시간 표시만 합니다. 로드뷰 이미지를 캡처하거나 저장하지 말고, 학습 데이터로 쓰지 마세요.
촬영 사진에는 얼굴이나 차량번호가 포함될 수 있으므로 공개 저장소에 올리지 않습니다.

## 알려진 한계

- iOS의 `webkitCompassHeading`이 휴대폰 기울기에 어떻게 반응하는지는 실측이 필요합니다.
- 자북 → 진북 보정은 서울 기준 상수입니다.
- 기기 저장소를 비우면 내보내지 않은 기록이 사라집니다.
