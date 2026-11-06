import { useState, useEffect } from 'react';
import { readStorage, writeStorage } from '../utils/storage';

// 값이 올바른 모양이면 그대로, 아니면 null을 돌려주는 검증 함수
export type Parser<T> = (raw: unknown) => T | null;

// 정해진 값 중 하나인지 확인하는 검증 함수를 만든다
export function oneOf<T extends string>(...allowed: T[]): Parser<T> {
  return raw => (typeof raw === 'string' && (allowed as string[]).includes(raw) ? (raw as T) : null);
}

// 검증 함수를 따로 주지 않으면 기본값의 모양(문자열·불리언·null 가능 문자열·배열)과 같을 때만 받아들인다.
function inferParser<T>(initial: T): Parser<T> {
  if (typeof initial === 'boolean') return raw => (typeof raw === 'boolean' ? (raw as T) : null);
  if (typeof initial === 'string') return raw => (typeof raw === 'string' ? (raw as T) : null);
  if (initial === null) return raw => (raw === null || typeof raw === 'string' ? (raw as T) : null);
  if (Array.isArray(initial)) return raw => (Array.isArray(raw) ? (raw as T) : null);
  return raw => raw as T;
}

// localStorage에 값을 기억하는 상태. 저장된 값이 깨졌거나 모양이 틀리면 기본값으로 시작하고,
// 그 원문은 덮어쓰이기 전에 따로 보관한다.
export function usePersistentState<T>(key: string, initial: T, parse: Parser<T> = inferParser(initial)) {
  const [value, setValue] = useState<T>(() => readStorage(key, parse, initial));
  useEffect(() => {
    writeStorage(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}
