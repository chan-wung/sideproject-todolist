import { useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

// 매 렌더링마다 새로 만들어지는 핸들러들을, 주소가 바뀌지 않으면서 항상 "최신" 핸들러를 부르는 함수로 바꿔 준다.
// React.memo로 감싼 목록 카드가 핸들러 주소 때문에 매번 다시 그려지는 것을 막는 데 쓴다.
// 키 목록은 처음 렌더링 때 정해진다고 가정한다(중간에 키를 늘리고 줄이지 않는다).
export function useStableCallbacks<T extends Record<string, AnyFn>>(fns: T): T {
  const latest = useRef(fns);
  latest.current = fns;
  const stable = useRef<Record<string, AnyFn>>({});
  for (const key of Object.keys(fns)) {
    if (!(key in stable.current)) stable.current[key] = (...args) => latest.current[key](...args);
  }
  return stable.current as T;
}
