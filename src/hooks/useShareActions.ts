import { useCallback } from 'react';
import type { ToastState } from './useToast';
import { copyText, shareText, copyFeedback, shareFeedback, kakaoFeedback } from '../utils/share';
import { shareToKakao } from '../utils/kakao';

// 복사·공유·카카오 공유를 실행하고 결과에 맞는 토스트를 띄운다.
export function useShareActions(showToast: (state: Omit<ToastState, 'id'>) => void) {
  // 복사에 성공했는지 돌려준다 (실패하거나 예외가 나면 false). 호출한 쪽이 성공 뒤에만 후속 처리를 하도록 쓴다.
  const runCopy = useCallback(async (text: string, successMessage: string): Promise<boolean> => {
    let ok = false;
    try {
      ok = await copyText(text);
    } catch {
      ok = false;
    }
    showToast(copyFeedback(ok, successMessage));
    return ok;
  }, [showToast]);

  const runShare = useCallback(async (title: string, text: string) => {
    const feedback = shareFeedback(await shareText(title, text));
    if (feedback) showToast(feedback);
  }, [showToast]);

  const runKakaoShare = useCallback(async (text: string) => {
    const feedback = kakaoFeedback(await shareToKakao(text));
    if (feedback) showToast(feedback);
  }, [showToast]);

  return { runCopy, runShare, runKakaoShare };
}
