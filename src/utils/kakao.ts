// 카카오톡 공유 (JS SDK sendDefault 텍스트 템플릿 — 콘솔 메시지 템플릿 등록 불필요)
// JavaScript 키는 공개되어도 콘솔에 등록된 도메인에서만 동작한다.
const KAKAO_JS_KEY = 'c536500e6b32afe56a70f163793a3c68';
const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js';

// 공유 메시지 하단 버튼이 여는 링크. 카카오 콘솔 [플랫폼 > Web]에 등록된 도메인과 일치해야 한다.
const SHARE_LINK_URL = 'https://todolist-two-smoky.vercel.app';

// 텍스트형 템플릿의 본문 최대 길이 (카카오 정책 200자)
const TEXT_LIMIT = 200;

interface KakaoSDK {
  init(key: string): void;
  isInitialized(): boolean;
  Share: { sendDefault(settings: Record<string, unknown>): void };
}

declare global {
  interface Window { Kakao?: KakaoSDK }
}

let loadPromise: Promise<KakaoSDK> | null = null;

function loadSdk(): Promise<KakaoSDK> {
  if (window.Kakao) return Promise.resolve(window.Kakao);
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (window.Kakao) resolve(window.Kakao);
        else reject(new Error('Kakao SDK unavailable after load'));
      };
      script.onerror = () => {
        loadPromise = null; // 오프라인 등 일시 실패 시 다음 시도에서 다시 로드
        reject(new Error('Kakao SDK load failed'));
      };
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

// 클릭 시점에 SDK 로드가 끝나 있어야 공유 팝업이 팝업 차단에 걸리지 않으므로,
// 앱 시작 시 미리 불러 둔다. 실패해도(오프라인 등) 앱 동작에는 영향 없음.
export function preloadKakao() {
  loadSdk().catch(() => {});
}

export async function shareToKakao(text: string): Promise<boolean> {
  try {
    const kakao = await loadSdk();
    if (!kakao.isInitialized()) kakao.init(KAKAO_JS_KEY);
    kakao.Share.sendDefault({
      objectType: 'text',
      text: text.length > TEXT_LIMIT ? `${text.slice(0, TEXT_LIMIT - 1)}…` : text,
      link: { webUrl: SHARE_LINK_URL, mobileWebUrl: SHARE_LINK_URL },
    });
    return true;
  } catch {
    return false;
  }
}
