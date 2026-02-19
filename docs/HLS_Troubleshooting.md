# Hls.js 재생 트러블 슈팅 : Safari 네이티브 분기부터 Vite 프록시로 CORS 해결

### 목표

- Safari: 브라우저 네이티브 HLS로 재생(`<video src="m3u8">`)
- Chrome/Edge/Firefox: hls.js(MSE) 로 재생
- 외부 m3u8 테스트 시 CORS 문제를 피하기 위해 Vite dev proxy로 우회

---

## 1) Safari가 아닌 상태에서 Safari native HLS로 찍힘

### 증상

Chrome에서 실행했는데 콘솔에 해당 로그가 뜸

- [MODE] Safari native HLS
- 또는 Native HLS(maybe)

### 원인

```js
const canNativePlay = videoEl.canPlayType("application/vnd.apple.mpegurl");
if (canNativePlay) {
  // native...
}
```

`canPlayType()`은 반환값이 `"" | "maybe" | "probably"` 인데,
Chrome 에서도 `"maybe"` 가 나오는 경우가 있어서 truthy로 판단되어 네이티브 분기로 들어가는 오탐이 발생했다.

### 해결

Safari일 때만 네이티브 분기로 고정한다.

```js
const ua = navigator.userAgent;
const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);

const canNativePlay = videoEl.canPlayType("application/vnd.apple.mpegurl");

if (isSafari && canNativePlay) {
  // Safari 네이티브
} else {
  // 나머지는 hls.js
}
```

point: 네이티브 가능 여부가 아니라 Safari 여부를 먼저 확정해서 우연 재생을 제거

## 2) Safari 분기 막고 hls.js로 타니 CORS 에러 발생

### 증상

Chrome에서 hls.js(MSE)로 재생 시도하면 콘솔에 아래 에러:

- Access to XMLHttpRequest ... has been blocked by CORS policy
- [ERROR] networkError manifestLoadError 또는 manifestParsingError

### 원인

hls.js는 m3u8/세그먼트(ts, m4s)를 XHR/fetch로 직접 요청한다.
즉, 서버가 `Access-Control-Allow-Origin` 헤더를 제공하지 않으면 브라우저가 차단한다.

반면 `<video src="...m3u8">` 네이티브 로딩은 브라우저 미디어 파이프라인에서 처리되어 겉보기엔 "되는 것처럼" 보이는 케이스가 생길 수 있는데, hls.js는 **CORS가 필수**다.

### 결론

운영/개발 모두 "브라우저에서 hls.js로 재생" 하려면:

- 서버가 CORS 허용을 해주거나
- 같은 origin으로 보이게 reverse proxy(프록시)를 둬야한다.

---

## 3) 해결 시도 - Bite dev proxy로 우회

개발 환경에서는 백엔드 없이도 Vite 서버가 프록시 역할을 할 수 있다.

### 설정: `vite.config.js`(프로젝트 루트에 생성)

```js
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/hls-proxy": {
        target: "https://d2zihajmogu5jn.cloudfront.net",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/hls-proxy/, ""),
      },
    },
  },
});
```

### 사용법

원본 m3u8:
https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8

프록시 경로로 변경:
/hls-proxy/bipbop-advanced/bipbop_16x9_variant.m3u8


### 최종 정상 상태 - 계속 요청이 발생함
정상 패턴 (Network 탭)

재생이 정상이라면 요청이 계속 발생한다:

- prog_index.m3u8 (playlist) 반복 요청 (200/304 가능)
- 세그먼트 파일 요청 (200 또는 206 Range)
- 자막이 있으면 fileSequence*.webvtt 연속 요청

즉 HLS는 구조적으로 “m3u8(목차) + 조각(세그먼트)”를 계속 받아서 재생하므로 요청이 계속 생기는 게 정상이다.

---
### 운영 시 프록시 필요 여부
- 프록시는 CORS 우회를 위해 자주 사용
- 운영에서 보통
    1. CDN/미디어 서버에서 CORS 허용 헤더 설정(정석)
    2. 같은 도메인으로 `/hls/*` 경로를 reverse proxy(Nginx) 로 붙여서 CORS 회피
    3. 권한/토큰 기반이면 백엔드가 서명 URL 발급 또는 프록시로 보호

즉 "프록시 필수" 보다 브라우저가 접근 가능한 형태(CORS/동일 오리진)로 제공하는게 필수.

### 참고 사항
테스트 가능한 m3u8 경로
- https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8
- https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8
- https://mnmedias.api.telequebec.tv/m3u8/29880.m3u8
- http://184.72.239.149/vod/smil:BigBuckBunny.smil/playlist.m3u8
- http://www.streambox.fr/playlists/test_001/stream.m3u8


해당 경로는 CORS 관련 처리가 필요(버튼 누를 시 proxy 링크로 변환해서 들어감)
- https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8