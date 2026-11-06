import { useSyncExternalStore } from 'react';
import { isUpdateReady, subscribeUpdate } from '../utils/pwaUpdate';

// 새 버전이 준비되어 있고 사용자가 아직 미루지 않았으면 true
export function useUpdateReady() {
  return useSyncExternalStore(subscribeUpdate, isUpdateReady);
}
