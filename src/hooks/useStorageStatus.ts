import { useSyncExternalStore } from 'react';
import { getStorageStatus, subscribeStorageStatus } from '../utils/storage';

// 저장에 실패한 키와 보관된 손상 원문이 있는지 알려 준다. 값이 바뀔 때만 다시 그린다.
export function useStorageStatus() {
  return useSyncExternalStore(subscribeStorageStatus, getStorageStatus);
}
