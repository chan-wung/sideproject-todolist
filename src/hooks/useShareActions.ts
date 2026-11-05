import { useCallback } from 'react';
import type { ToastState } from './useToast';
import { copyText, shareText, copyFeedback, shareFeedback, kakaoFeedback } from '../utils/share';
import { shareToKakao } from '../utils/kakao';

// 복사·공유·카카오 공유를 실행하고 결과에 맞는 토스트를 띄운다.
export function useShareActions(showToast: (state: Omit<ToastState, 'id'>) => void) {
  const runCopy = useCallback(async (text: string, successMessage: string) => {
    showToast(copyFeedback(await copyText(text), successMessage));
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
