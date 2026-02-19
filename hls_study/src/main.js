import { default as Hls } from "hls.js";

// 해당 요소들로 입력 -> 로드 -> 재생 -> 상태/로그 흐름 만듦
const videoEl = document.getElementById("video");
const urlInputEl = document.getElementById("urlInput");
const loadBtnEl = document.getElementById("loadBtn");
const stopBtnEl = document.getElementById("stopBtn");
const statusTextEl = document.getElementById("statusText");
const qualitySelectEl = document.getElementById("qualitySelect"); 
const logBoxEl = document.getElementById("logBox");

// 전역 상태(현재 hls 인스턴스/cleanup)
let hls = null; // 현재 붙어있는 Hls 인스턴스
let cleanup = null; // 재생 종료 시 호출할 정리 함수

// UI 유틸(상태/로그)
function setStatus(text) {
  statusTextEl.textContent = text;
}

function log(...args) {
  console.log(...args);
  logBoxEl.textContent += args.map(String).join(" ") + "\n";
  logBoxEl.scrollTop = logBoxEl.scrollHeight;
}

function clearLog() {
  logBoxEl.textContent = "";
}

// ===============
// 퀄리티 드롭다운
// ===============
function setupQualitySelect(levels) {
  // 드롭다운 초기화
  qualitySelectEl.innerHTML = "";

  // Auto 옵션(= -1) 추가
  const autoOpt = document.createElement("option");
  autoOpt.value = "-1";
  autoOpt.textContent = "Auto";
  qualitySelectEl.appendChild(autoOpt);

  // 각 레벨(화질) 옵션 추가
  levels.forEach((lvl, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);

    const h = lvl.height ? `${lvl.height}p` : "unknown";
    const br = lvl.bitrate ? `${Math.round(lvl.bitrate / 1000)}kbps` : "";
    opt.textContent = `${h} ${br}`.trim();

    qualitySelectEl.appendChild(opt);
  });

  // 사용 가능 상태로 활성화
  qualitySelectEl.disabled = false;
  qualitySelectEl.value = "-1"; // 기본 Auto
}

// ===============
// 재생 중지/정리(Stop)
// ===============
function stopPlayback() {
  setStatus("stopped");

  // 기존 cleanup이 있으면 실행
  if (cleanup) {
    cleanup();
    cleanup = null;
  }

  // video 엘리먼트 상태 초기화
  videoEl.pause();
  videoEl.removeAttribute("src");
  videoEl.load();

  // 퀄리티 셀렉트 비활성화/초기화
  qualitySelectEl.disabled = true;
  qualitySelectEl.innerHTML = `<option value="-2">로드 후 활성화</option>`;
}

// ===============
// HLS 마운트 로직
// ===============
function mountHls(src) {
  // 안전하게 기존 재생이 있으면 먼저 정리
  stopPlayback();

  clearLog();
  setStatus("loading...");
  log("[LOAD]", src);

  // Safari / 네이티브 HLS 분기
  const canNativePlay = videoEl.canPlayType("application/vnd.apple.mpegurl");

  if (canNativePlay) {
    log("[MODE] Safari native HLS");

    // video src 에 m3u8을 바로 넣음
    videoEl.src = src;

    // 로딩이 끝나면 play 시도
    videoEl.addEventListener(
      "loadedmetadata",
      () => {
        setStatus("ready(native)");
        videoEl.play().catch(() => {
          setStatus("ready(native) - autoplay blocked");
          log("[WARN] autoplay blocked (user gesture needed)");
        });
      },
      { once: true },
    );

    // 정리 함수 반환
    return () => {
      log("[CLEANUP] native");
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
    };
  }

  // hls.js(MSE) 분기
  if (Hls.isSupported()) {
    log("[MODE] hls.js via MSE");

    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });

    hls.loadSource(src);
    hls.attachMedia(videoEl);

    // 매니페스트 파싱 완료 이벤트
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setStatus("ready(hls.js)");
      log("[EVENT] MANIFEST_PARSED");

      // 퀄리티 목록 세팅(화질 선택 UI 활성화)
      setupQualitySelect(hls.levels);

      // 재생 시도
      videoEl.play().catch(() => {
        setStatus("ready(hls.js) - autoplay blocked");
        log("[WARN] autoplay blocked (user gesture needed)");
      });
    });

    // 에러 처리(복구 패턴)
    hls.on(Hls.Events.ERROR, (event, data) => {
      log("[ERROR]", data.type, data.details, "fatal=" + data.fatal);

      if (!data.fatal) return;

      setStatus("error(fatal)");

      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          log("[RECOVER] network error → hls.startLoad()");
          hls.startLoad();
          setStatus("recovering(network)...");
          break;

        case Hls.ErrorTypes.MEDIA_ERROR:
          log("[RECOVER] media error → hls.recoverMediaError()");
          hls.recoverMediaError();
          setStatus("recovering(media)...");
          break;

        default:
          log("[RECOVER] unknown fatal → hls.destroy()");
          hls.destroy();
          hls = null;
          setStatus("destroyed");
          break;
      }
    });

    // (학습용) 로딩 흐름 로그
    hls.on(Hls.Events.MANIFEST_LOADING, () => log("[EVENT] MANIFEST_LOADING"));
    hls.on(Hls.Events.MANIFEST_LOADED, () => log("[EVENT] MANIFEST_LOADED"));
    hls.on(Hls.Events.LEVEL_LOADED, () => log("[EVENT] LEVEL_LOADED"));
    hls.on(Hls.Events.FRAG_LOADED, () => log("[EVENT] FRAG_LOADED"));

    // cleanup 함수: destroy로 정리
    return () => {
      log("[CLEANUP] hls.js destroy()");
      if (hls) {
        hls.destroy();
        hls = null;
      }
    };
  }

  // 여기까지 오면 HLS 지원 불가
  setStatus("not supported");
  log("[FAIL] HLS not supported in this browser");
  return () => {};
}

// ========================
// 이벤트 핸들러 : Load 버튼
// ========================
// 입력한 m3u8 URL을 mountHls에 전달하고 cleanup을 저장함

loadBtnEl.addEventListener("click", () => {
  const src = urlInputEl.value.trim();

  // URL이 비었으면 안내
  if (!src) {
    setStatus("please input url");
    log("[WARN] m3u8 URL is empty");
    return;
  }

  // mountHls가 반환한 cleanup 함수를 저장
  cleanup = mountHls(src);
});

// ========================
// 이벤트 핸들러 : Stop 버튼
// ========================
// 재생을 완전히 정리하고 초기 상태로 돌림
stopBtnEl.addEventListener("click", () => {
  log("[STOP]");
  stopPlayback();
});

// ========================
// 이벤트 핸들러 : Quality 드롭다운
// ========================
// 네이티브 재생(Safari)에서는 hls.js가 없어서 동작하지 않음
// hls.js 모드에서만 currentLevel을 조정한다.
qualitySelectEl.addEventListener("change", () => {
  // hls 인스턴스가 없으면 무시
  if (!hls) {
    log("[QUALITY] ignored (no hls instance)");
    return;
  }

  const v = Number(qualitySelectEl.value);

  // -1이면 Auto, 0..n 이면 고정
  hls.currentLevel = v;

  if (v === -1) log("[QUALITY] Auto");
  else log("[QUALITY] fixed level =", v);
});

/**
 * =========================
 * 초기 안내(샘플 안내 문구)
 * =========================
 */
setStatus("idle");
log("m3u8 URL을 입력하고 Load를 누르세요.");
log("Safari는 native, Chrome/Edge/Firefox는 hls.js(MSE)로 재생됩니다.");
