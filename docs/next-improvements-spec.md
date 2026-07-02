# 다음 개선 3종 명세서 — 유닛테스트 / 메모 연결 개수 배지 / 마감일 브라우저 알림

> 이 문서는 구현 담당 에이전트(agy)가 바로 착수할 수 있도록 작성된 기능 명세서입니다.
> 작성 시점 기준 코드 스냅샷을 근거로 하므로, 구현 전 관련 파일이 그 사이 변경되지 않았는지 먼저 확인하세요.
>
> 세 작업은 서로 독립적이므로 **A → B → C 순서로 각각 완결(빌드+린트 통과)시키고 커밋도 따로** 하는 것을 권장한다. (A는 `build`, B/C는 `feat` 스코프)

## Context

방금 `memoId` → `memoIds` 스키마 마이그레이션을 포함한 다중 메모 연결 기능이 완료됐다. 다음 사이클로 진행할 작업 3가지를 사용자가 선정했다:

- **A. `useTodos.ts` 유닛테스트** — 지금까지 모든 검증이 "빌드+린트+수동 클릭"뿐이었다. 마이그레이션·prune·undo처럼 회귀 위험이 큰 로직에 안전망이 없다. Vitest 기반 테스트 인프라를 처음으로 도입한다. (완료)
- **B. QuickMemo 연결 개수 배지** — 다중 연결 기능을 만들었지만 메모장 사이드바에서 "이 메모가 몇 개 할 일에 연결돼 있는지"가 안 보인다. 발견성 보완. (완료)
- **C. 마감일 브라우저 알림** — BACKLOG.md 1번 항목. 오늘 마감/지연 항목을 브라우저 데스크탑 알림으로 알려준다. 완료 시 BACKLOG 1번을 "완료된 항목"으로 이동. (완료)

---

# A. 유닛테스트 도입 (Vitest)

## A-1. 현재 상태 (구현 전 확인)

- `package.json`: 테스트 관련 의존성/스크립트 전무. scripts는 `dev`/`build`(`tsc -b && vite build`)/`lint`/`preview`뿐.
- `vite.config.ts`: `@vitejs/plugin-react` + `VitePWA` 플러그인 사용 중.
- `eslint.config.js`: `files: ['**/*.{ts,tsx}']`에 browser globals. 테스트 파일도 이 규칙을 타게 된다.
- 테스트 대상 핵심 로직:
  - `src/utils/date.ts` — `isToday`/`isOverdue`/`isThisWeek`/`formatDate`/`calculateNextRecurrence` (전부 순수 함수, `new Date()` 의존)
  - `src/hooks/useTodos.ts` — `migrateTodo`(L12-21, **현재 module-private — export 필요**), `loadFromStorage`, `withUndo`/`performUndo`, `linkMemoToTodo`(중복 가드)/`unlinkMemoFromTodo`(빈 배열→undefined), `pruneMemoLinks`, `importData`(마이그레이션 경유), `toggleTodo`(반복 주기 복제), subtask 계열, `toggleSubtasksCollapsed`/`collapseAllSubtasks`/`expandAllSubtasks`
  - `src/hooks/usePersistentState.ts` — localStorage 동기화

## A-2. 설계 결정

- **프레임워크: Vitest** (Vite 프로젝트 표준. Jest 대비 설정 거의 불필요)
- **설정 파일: 루트에 별도 `vitest.config.ts`** 생성. `vite.config.ts`에 test 필드를 합치지 않는 이유: VitePWA 플러그인이 테스트 실행에 끼어드는 것을 원천 차단. Vitest는 `vitest.config.ts`가 있으면 그걸 우선 사용한다.
- **globals 미사용** — 테스트 파일에서 `import { describe, it, expect, beforeEach, vi } from 'vitest'`로 명시적 import. tsconfig 수정이 전혀 필요 없어진다(`tsc -b` 빌드에 영향 없음).
- **환경: jsdom** — `renderHook`과 `localStorage`가 필요하므로. (jsdom은 localStorage 내장 구현 제공)
- **훅 테스트: `@testing-library/react`의 `renderHook` + `act`** 사용.
- **테스트 파일 위치: 대상 파일 옆** (`src/utils/date.test.ts`, `src/hooks/useTodos.test.ts` 등). 별도 `__tests__` 폴더 안 만듦.
- **`migrateTodo`를 export로 변경** — `src/hooks/useTodos.ts` L12의 `function migrateTodo` 앞에 `export` 추가. 순수 함수라 직접 테스트가 가장 값어치 있음.

## A-3. 구현 내용

### 의존성 설치 (devDependencies)
```
npm i -D vitest jsdom @testing-library/react @testing-library/dom
```
(`@testing-library/react` v16은 `@testing-library/dom`이 peer라 함께 설치)

### `package.json` scripts 추가
```json
"test": "vitest run",
"test:watch": "vitest"
```

### `vitest.config.ts` (신규, 루트)
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
});
```

### `src/hooks/useTodos.ts` — 한 줄 수정
`function migrateTodo(raw: any): Todo {` → `export function migrateTodo(raw: any): Todo {`

### `src/utils/date.test.ts` (신규)
`vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-07-02T10:00:00'))`으로 기준 시각 고정 후:
- `isToday`: 오늘 날짜 문자열 → true, 어제/내일 → false, undefined → false
- `isOverdue`: 어제 → true, 오늘 → false (당일은 지연 아님), undefined → false
- `isThisWeek`: 오늘 → true, 7일 후 → true, 8일 후 → false, 어제(지난 날짜) → false
- `formatDate`: `'2026-07-02'` → `'2026.07.02'` (0 패딩 확인)
- `calculateNextRecurrence`: daily → +1일, weekly → +7일, monthly → +1개월(YYYY-MM-DD 포맷), rule이 'none'/undefined → undefined, 월말 경계(예: 1/31 + monthly)의 실제 동작을 기록하는 테스트 포함
- afterEach에서 `vi.useRealTimers()`

### `src/hooks/useTodos.test.ts` (신규)
공통: `beforeEach(() => localStorage.clear())`.

**`migrateTodo` 순수 함수 테스트** (renderHook 불필요):
- `{ memoId: 'a' }` → `{ memoIds: ['a'] }`이고 `memoId` 키가 사라짐
- `{ memoIds: ['a','b'] }` → 그대로 유지 (idempotent), 잔존 `memoId` 키는 제거
- `memoId` 없음 → `memoIds` 필드 자체가 없음(undefined)
- 빈 문자열 `memoId: ''` → `memoIds` 생성 안 함

**훅 테스트** (`renderHook(() => useTodos())` + `act`):
- `addTodo` — 항목이 배열 맨 앞에 추가되고 text가 trim됨, 빈 문자열이면 추가 안 됨
- `toggleTodo` — 완료 토글, 반복 주기(`recurrence: 'daily'`) 있는 항목 완료 시 새 항목이 복제되어 맨 앞에 추가되고 dueDate가 다음 주기로 설정됨
- `deleteTodo` + `performUndo` — 삭제 후 undoMessage 존재, performUndo 시 원복
- `linkMemoToTodo` — 연결 추가, **같은 메모 재연결 시 중복 안 생김**
- `unlinkMemoFromTodo` — 하나 해제, **마지막 하나 해제 시 `memoIds`가 `undefined`** (빈 배열 아님)
- `pruneMemoLinks` — 여러 할 일에 걸친 삭제 메모 정리, 유효한 연결은 유지, 전부 무효면 undefined로 접힘
- `importData` — 구버전 `memoId` 포맷 배열을 넣으면 `memoIds`로 마이그레이션되어 로드됨, `id`/`text` 없는 항목이 섞이면 false 반환하고 상태 변경 없음
- `toggleSubtasksCollapsed` / `collapseAllSubtasks` / `expandAllSubtasks` — 접힘 상태 토글, subtask 없는 항목은 collapse/expand All에서 제외
- `addSubtask` — 접힌 상태에서 추가 시 `subtasksCollapsed: false`로 자동 펼침
- localStorage 영속성 — `addTodo` 후 `localStorage.getItem('todolist-items')`에 반영 확인

**localStorage 로드 마이그레이션 테스트**:
- `localStorage.setItem('todolist-items', JSON.stringify([{...구버전 memoId 항목}]))` 세팅 후 `renderHook` → `allTodos[0].memoIds`가 배열로 마이그레이션되어 있는지 확인

### `src/hooks/usePersistentState.test.ts` (신규, 간단히)
- 초기값 반환, set 후 localStorage 반영, 저장된 값이 있으면 그걸 우선 로드, 깨진 JSON이면 초기값 fallback

## A-4. 주의사항
- `tsc -b`(빌드)가 테스트 파일도 타입체크한다. vitest를 명시적 import로 쓰므로 별도 tsconfig 수정 없이 통과해야 함 — 빌드가 깨지면 즉시 원인 확인.
- 테스트에서 `@typescript-eslint/no-explicit-any`에 걸릴 수 있는 구버전-포맷 객체 리터럴은 `as unknown as Todo` 캐스팅이나 eslint-disable 주석으로 처리 (기존 `useTodos.ts` 관례와 동일).
- CHANGELOG/README 자동 갱신 훅이 커밋 시 동작하므로 문서는 수동 갱신 불필요. 단 A는 사용자 눈에 보이는 기능이 아니므로 훅이 "변경 없음" 판단하는 게 정상.

---

# B. QuickMemo 사이드바에 연결 개수 배지

## B-1. 현재 상태

`src/components/QuickMemo.tsx`는 이미 `todos: Todo[]` prop을 받고 있다 (다중 연결 기능에서 추가됨). 사이드바 목록 아이템(L167-205)은 다음 구조:
```tsx
<li className="quick-memo-modal__item ...">
  <span className="quick-memo-modal__drag-handle" aria-hidden="true">⠿</span>
  <span className="quick-memo-modal__item-tit">{m.title || '제목 없음'}</span>
  <button className="quick-memo-modal__item-pin...">...</button>
  <button className="quick-memo-modal__item-del">...</button>
</li>
```
`--active`(파란 배경+흰 글자), `--pinned`(초록 배경+흰 글자) modifier가 있어서 배지 색상도 이 두 상태에서 잘 보여야 한다. (`__item-del`이 이 패턴의 참고 사례 — `_quick-memo.scss` L193-207에서 active/pinned일 때 `rgba(255,255,255,0.7)`로 색을 바꿈)

## B-2. 구현 내용

### `src/components/QuickMemo.tsx`
사이드바 map 안에서 개수 계산 후, `__item-tit` 바로 뒤에 조건부 렌더:
```tsx
{filteredMemos.map(m => {
  const linkedCount = todos.filter(t => (t.memoIds ?? []).includes(m.id)).length;
  return (
    <li ...기존 그대로>
      <span className="quick-memo-modal__drag-handle" aria-hidden="true">⠿</span>
      <span className="quick-memo-modal__item-tit">{m.title || '제목 없음'}</span>
      {linkedCount > 0 && (
        <span className="quick-memo-modal__item-count" aria-label={`연결된 할 일 ${linkedCount}개`}>
          {linkedCount}
        </span>
      )}
      ...핀/삭제 버튼 기존 그대로
    </li>
  );
})}
```
(map 콜백을 `( ... )` 표현식에서 `{ return ( ... ) }` 블록으로 바꿔야 함)

### `src/styles/components/_quick-memo.scss`
`&__item-tit`과 `&__item-del` 사이에 추가. 속성 순서 규칙(Box Model → Layout → Design → Typo&Pos) 엄수:
```scss
&__item-count {
  min-width: rem(18);
  height: rem(18);
  padding: 0 rem(5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--color-main-5);
  border-radius: 100px;
  @include font(10, "Bold");
  color: var(--color-main);

  .quick-memo-modal__item--active &,
  .quick-memo-modal__item--pinned & {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
  }
}
```

## B-3. 검증
- 메모장 열어서 연결된 할 일이 있는 메모에 개수 배지가 뜨는지, 없는 메모엔 안 뜨는지
- 활성(파란)/고정(초록) 탭에서 배지가 흰 톤으로 잘 보이는지
- 할 일 쪽에서 연결 해제하면 배지 숫자가 즉시 줄어드는지 (todos prop이 반응형이므로 자동)

---

# C. 마감일 브라우저 알림 (Notification API)

## C-1. 현재 상태 / 재사용할 것들

- 날짜 판정: `src/utils/date.ts`의 `isToday`/`isOverdue` 그대로 재사용 (App.tsx의 `dueTodayCount`/`overdueCount` 계산과 동일 기준)
- 사용자 설정 영속화: `src/hooks/usePersistentState.ts` 재사용 (`todolist-pref-*` 키 네이밍 관례)
- 설정 UI: `src/components/SettingsModal.tsx` — 현재 "데이터 초기화" 섹션 하나뿐(`settings-modal__section` 구조). 같은 패턴으로 "알림" 섹션 추가
- PWA(vite-plugin-pwa, autoUpdate)라 서비스워커가 등록돼 있음 — 알림 발송 시 SW 경유가 더 호환성 좋음

## C-2. 설계 결정

- **옵트인 방식**: 페이지 로드 시 자동으로 권한 요청하지 않는다(브라우저가 차단하고 UX도 나쁨). 설정 모달의 토글을 켤 때만 `Notification.requestPermission()` 호출.
- **알림 형태**: 개별 할 일마다 알림을 쏘지 않고, **앱 시작 시 하루 1회 요약 알림 1건** — "오늘 마감 N건 · 지연 M건". 스팸 방지와 구현 단순화.
- **중복 방지**: `localStorage['todolist-notify-last']`에 마지막 알림 날짜(`YYYY-MM-DD`)를 기록, 같은 날이면 스킵.
- **발송 경로**: `navigator.serviceWorker.getRegistration()`이 있으면 `reg.showNotification()`(PWA 표준 경로), 없으면 `new Notification()` fallback. 전체를 try/catch로 감싸 실패해도 앱에 영향 없게.
- **로직 위치**: 신규 훅 `src/hooks/useDueNotifications.ts`. App.tsx에서 호출.

## C-3. 구현 내용

### `src/hooks/useDueNotifications.ts` (신규)
```ts
import { useEffect } from 'react';
import type { Todo } from '../types/todo';
import { isToday, isOverdue } from '../utils/date';

const NOTIFY_LAST_KEY = 'todolist-notify-last';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function showNotification(title: string, body: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: '/pwa-192x192.png' });
    } else {
      new Notification(title, { body });
    }
  } catch {
    // 알림 실패는 조용히 무시 (앱 동작에 영향 없음)
  }
}

export function useDueNotifications(todos: Todo[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (localStorage.getItem(NOTIFY_LAST_KEY) === todayStr()) return;

    const dueToday = todos.filter(t => !t.completed && isToday(t.dueDate)).length;
    const overdue = todos.filter(t => !t.completed && isOverdue(t.dueDate)).length;
    if (dueToday === 0 && overdue === 0) return;

    const parts: string[] = [];
    if (overdue > 0) parts.push(`지연 ${overdue}건`);
    if (dueToday > 0) parts.push(`오늘 마감 ${dueToday}건`);
    showNotification('Todo List 마감 알림', parts.join(' · '));
    localStorage.setItem(NOTIFY_LAST_KEY, todayStr());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // 의도적으로 마운트/토글 시에만 — todos 변화마다 재발송하지 않음
}
```
- deps에서 `todos`를 제외하는 이유: 하루 1회 요약이 목적이라 마운트(또는 토글 on) 시점의 스냅샷이면 충분. `todos`를 넣으면 lint는 조용해지지만 매 변경마다 effect가 돌아 date-key 체크만 반복한다 — 어느 쪽이든 동작은 같으니 **lint 경고 없이 깔끔한 쪽을 선택해도 됨** (구현 시 `todos`를 deps에 넣고 date-key 가드에 맡기는 방식도 허용. 단 eslint-disable 없이 통과할 것).
- `icon: '/pwa-192x192.png'` — public 폴더의 실제 PWA 아이콘 파일명을 확인해서 존재하는 경로로 넣을 것(pwaAssets 생성 파일명 확인). 없으면 icon 옵션 생략.

### `src/App.tsx`
- `usePersistentState<boolean>('todolist-pref-notify', false)`로 `notifyEnabled`/`setNotifyEnabled` 추가 (import 이미 있는지 확인 — 없으면 추가)
- `useDueNotifications(allTodos, notifyEnabled)` 호출
- `<SettingsModal>`에 `notifyEnabled={notifyEnabled}` / `onToggleNotify={...}` 전달

### `src/components/SettingsModal.tsx`
- Props에 `notifyEnabled: boolean; onToggleNotify: (v: boolean) => void;` 추가
- "데이터 초기화" 섹션 **위에** "알림" 섹션 추가 (같은 `settings-modal__section` 구조):
```tsx
<section className="settings-modal__section">
  <h3 className="settings-modal__section-tit">알림</h3>
  <ul className="settings-modal__list">
    <li className="settings-modal__item">
      <div className="settings-modal__item-info">
        <strong className="settings-modal__item-tit">마감일 브라우저 알림</strong>
        <span className="settings-modal__item-desc">
          {notifySupported
            ? '앱을 열 때 하루 1회, 오늘 마감·지연 건수를 알려드립니다.'
            : '이 브라우저는 알림을 지원하지 않습니다.'}
        </span>
      </div>
      <label className="form-chk form-chk--checkbox">
        <input
          type="checkbox"
          checked={notifyEnabled}
          disabled={!notifySupported}
          onChange={handleNotifyToggle}
        />
        <span className="form-chk__text"><span className="screen-out">마감일 알림 사용</span></span>
      </label>
    </li>
  </ul>
</section>
```
- 토글 핸들러:
```ts
const notifySupported = 'Notification' in window;

async function handleNotifyToggle(e: React.ChangeEvent<HTMLInputElement>) {
  if (!e.target.checked) { onToggleNotify(false); return; }
  const permission = await Notification.requestPermission();
  onToggleNotify(permission === 'granted');
  // denied면 토글이 다시 꺼진 상태로 남음
}
```
- 권한이 `denied`인 경우: 토글을 켜도 즉시 꺼지는데, 사용자가 어리둥절할 수 있으므로 `Notification.permission === 'denied'`일 때 desc 텍스트를 "브라우저 설정에서 알림 권한이 차단되어 있습니다. 주소창의 사이트 설정에서 허용해 주세요."로 바꿔 표시.

### SCSS
- 기존 `settings-modal__*` 클래스와 `form-chk` 재사용이라 신규 규칙이 거의 불필요할 것. 토글 정렬이 어색하면 `_settings-modal.scss`(파일명은 실제 확인)에 최소한만 추가.

### `BACKLOG.md`
- 1번 항목("마감일 브라우저 알림")을 "완료된 항목"으로 이동, 남은 항목 번호는 그대로 두거나 자연스럽게 정리.

## C-4. 엣지 케이스
- **Notification 미지원 브라우저**: 토글 disabled + 안내 문구. 훅에서도 `'Notification' in window` 가드.
- **권한 denied**: 토글 켜기 시도 → requestPermission이 즉시 'denied' 반환 → 토글 안 켜짐 + 안내 문구.
- **HTTP 환경**: Notification API가 secure context 전용이라 지원 안 됨으로 감지됨 — 미지원 케이스와 동일 처리로 자연 커버.
- **알림 대상 0건**: 발송 안 하고 date-key도 기록하지 않음(그날 나중에 마감 항목이 생기고 새로고침하면 그때 발송됨).
- **iOS PWA 등 `new Notification()` 미지원 환경**: SW 경유 경로가 우선이고, 둘 다 실패해도 try/catch로 무해.

## C-5. 검증
1. `npm run build` + `npm run lint` + `npm run test` (A에서 만든 테스트 포함 전부 통과)
2. `npm run dev` 후:
   - 설정 모달 → 알림 토글 on → 브라우저 권한 팝업 → 허용 → 토글 유지 확인
   - 오늘 마감 또는 지연 항목이 있는 상태에서 새로고침 → 데스크탑 알림 1건 수신 확인
   - 다시 새로고침 → 같은 날은 알림 재발송 안 됨 확인 (`localStorage['todolist-notify-last']` 확인)
   - 개발자도구에서 `todolist-notify-last` 삭제 후 새로고침 → 재발송 확인
   - 토글 off → 새로고침 → 발송 안 됨 확인
   - (가능하면) 브라우저 사이트 설정에서 알림 차단 후 토글 시도 → 안 켜지고 안내 문구 표시 확인

---

# 공통 체크리스트

1. **A**: `vitest.config.ts` 신규, `package.json` deps/scripts, `useTodos.ts` migrateTodo export, `date.test.ts`/`useTodos.test.ts`/`usePersistentState.test.ts` 신규 — 커밋 `build : 테스트 인프라(Vitest) 도입 및 핵심 로직 유닛테스트 추가`
2. **B**: `QuickMemo.tsx` 배지 렌더, `_quick-memo.scss` `&__item-count` — 커밋 `feat : 메모장 사이드바에 연결된 할 일 개수 배지 표시`
3. **C**: `useDueNotifications.ts` 신규, `App.tsx` 배선, `SettingsModal.tsx` 알림 섹션, `BACKLOG.md` 정리 — 커밋 `feat : 마감일 브라우저 알림 기능 추가`
4. 각 커밋 전 `npm run build && npm run lint && npm run test` 전부 통과 확인
5. README/CHANGELOG는 커밋 훅이 자동 갱신 (B/C는 사용자 가시 기능이라 훅이 갱신할 것, A는 갱신 대상 아님이 정상)
6. `.claude/rules/html.md`, `.claude/rules/scss.md` 규칙(BEM, `<button type="button">`, `screen-out`, 색상/폰트 변수·믹스인, 속성 순서) 준수
