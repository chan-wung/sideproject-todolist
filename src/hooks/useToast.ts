import { useState, useCallback } from 'react';
import { generateId } from '../utils/id';

export interface ToastState {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  type?: 'primary' | 'success' | 'danger';
}

// 화면 아래에 잠깐 뜨는 알림 하나의 상태. 새 토스트는 id가 바뀌어 이전 것을 대체한다.
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((state: Omit<ToastState, 'id'>) => {
    setToast({ ...state, id: generateId() });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  return { toast, showToast, clearToast };
}
