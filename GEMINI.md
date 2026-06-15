"너는 프로젝트에 투입된 최고 수준의 시니어 자율 에이전트다. 새로운 대화를 시작하거나 첫 작업을 지시받으면, 사용자에게 인사나 일반 텍스트 답변을 절대 출력하지 말고 오직 프로젝트 최상단의 가이드 문서(CLAUDE.md, GEMINI.md, README.md 등)를 읽기 위한 도구 호출(Tool Call)만을 가장 먼저 실행해라.

    [절대 원칙]
    1. 첫 번째 응답(First Turn)에서는 사용자에게 대답하지 마라. 먼저 `view_file` 등의 도구 호출을 사용하여 CLAUDE.md 또는 GEMINI.md 파일을 무조건 읽어야 한다. 텍스트 답변을 먼저 출력하는 것은 치명적인 규칙 위반이다.
    2. 가이드 문서 본문 안에 세부 규칙 파일(예: .claude/rules/ 하위 파일들)을 참조(See)하라는 내용이 있다면, 모든 세부 파일을 끝까지 차례대로 다 찾아 읽고 완전히 숙지할 것.
    이 도구 호출 과정을 모두 끝마쳐 가이드를 완벽히 파악한 후에야 비로소 사용자에게 한국어로 답변하거나 코딩 작업을 시작해라."

---

# 작업 지시서 — 회사용 Todo List 업그레이드

> 이 섹션이 이번에 수행할 **실제 작업**이다. 위 [절대 원칙]에 따라 관련 파일을 모두 읽은 뒤, 아래 1~13단계를 순서대로 구현하라.
> 한국어 UI 문자열 / 영어 코드. 기존 코드 스타일(단일 `useTodos` 훅 + prop-drilling, BEM SCSS, CSS 변수 다크모드)을 그대로 따른다. **상태관리 라이브러리 도입 금지.**

작업 디렉터리: `D:\wungsGit\todolist`
스택: React 18 + TypeScript + Vite 5 + SCSS(Dart Sass). 데이터는 `localStorage`만 사용(백엔드 없음).

## 목표 (사용자 의도)
1. **회사에서 쓰기 편하게** — 업무용 기능 보강(검색·필터유지·서브태스크·오늘 뷰·백업)
2. **데이터가 올라가면 안 됨** — 할 일 데이터는 localStorage 전용이라 이미 안전. 내려받은 백업 파일만 `.gitignore`로 추가 차단
3. **사이드 프로젝트 완성도** — 다크모드 토글, 필터 상태 유지, README 갱신까지
   (무거운 테스트 프레임워크 도입은 이번 범위 외)

---

## 0. 시작 전 필수
1. 먼저 읽을 것: `src/hooks/useTodos.ts`(상태/영속 핵심 — lazy `useState` init + `useEffect` 저장 패턴), `src/types/todo.ts`, `src/App.tsx`, `src/components/`{`TodoInput`,`FilterBar`,`TodoList`,`TodoItem`,`Toast`,`ConfirmModal`}`.tsx`, `src/styles/abstracts/_variables.scss`(특히 `[data-theme="dark"]` 117-123행).
2. TS strict + `noUnusedLocals`/`noUnusedParameters` 활성 → 미사용 변수 금지.
3. 완료 후 `npm run build`(=`tsc -b && vite build`)와 `npm run lint` 모두 통과해야 함.

## 1. 타입 확장 — `src/types/todo.ts`
```ts
export interface Subtask { id: string; text: string; completed: boolean; }

export interface Todo {
  id: string; text: string; completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string; category: string; createdAt: string;
  subtasks?: Subtask[];                       // 추가 (옵셔널 → 기존 데이터 호환)
}

export type FilterStatus = 'all' | 'active' | 'completed';
export type SortKey = 'default' | 'priority' | 'dueDate';
export type DueScope = 'all' | 'today' | 'week' | 'overdue';   // 추가
```

## 2. 날짜 유틸(공통화) — 신규 `src/utils/date.ts`
`TodoItem.tsx`의 `isOverdue`/`formatDate`를 이리로 이동하고 `isToday`/`isThisWeek` 추가. 이후 `TodoItem`은 여기서 import(중복 정의 제거).
```ts
export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}
export function isToday(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).toDateString() === new Date().toDateString();
}
export function isThisWeek(dueDate?: string): boolean {   // 오늘~향후 7일(지난 건 제외)
  if (!dueDate) return false;
  const d = new Date(new Date(dueDate).toDateString()).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return d >= today && d <= today + 7 * 24 * 60 * 60 * 1000;
}
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
```

## 3. 영속 상태 훅(공통화) — 신규 `src/hooks/usePersistentState.ts`
`useTodos`의 localStorage 패턴을 제네릭화.
```ts
import { useState, useEffect } from 'react';
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial; }
    catch { return initial; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue] as const;
}
```

## 4. `useTodos` 보강 — `src/hooks/useTodos.ts`
기존 구조 유지하며 추가:
- import: `usePersistentState`, `isToday`/`isThisWeek`/`isOverdue` from `../utils/date`, `DueScope`/`Subtask` 타입.
- **필터/정렬/검색 상태를 영속화로 교체**(todos 자체는 기존 `todolist-items` 그대로):
  ```ts
  const [filterStatus, setFilterStatus] = usePersistentState<FilterStatus>('todolist-pref-status', 'all');
  const [filterCategory, setFilterCategory] = usePersistentState<string>('todolist-pref-category', 'all');
  const [sortKey, setSortKey] = usePersistentState<SortKey>('todolist-pref-sort', 'default');
  const [query, setQuery] = usePersistentState<string>('todolist-pref-query', '');
  const [dueScope, setDueScope] = usePersistentState<DueScope>('todolist-pref-due', 'all');
  ```
- **`filteredTodos`에 검색 + 마감범위 필터 추가**(기존 status/category match 옆에):
  ```ts
  const q = query.trim().toLowerCase();
  const queryMatch = !q || t.text.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
  const dueMatch =
    dueScope === 'all' ||
    (dueScope === 'today' && isToday(t.dueDate)) ||
    (dueScope === 'week' && isThisWeek(t.dueDate)) ||
    (dueScope === 'overdue' && !t.completed && isOverdue(t.dueDate));
  return statusMatch && categoryMatch && queryMatch && dueMatch;
  ```
- **서브태스크 mutator**(불변 업데이트):
  ```ts
  function addSubtask(todoId: string, text: string) {
    if (!text.trim()) return;
    setTodos(prev => prev.map(t => t.id === todoId
      ? { ...t, subtasks: [...(t.subtasks ?? []), { id: crypto.randomUUID(), text: text.trim(), completed: false }] } : t));
  }
  function toggleSubtask(todoId: string, subId: string) {
    setTodos(prev => prev.map(t => t.id === todoId
      ? { ...t, subtasks: (t.subtasks ?? []).map(s => s.id === subId ? { ...s, completed: !s.completed } : s) } : t));
  }
  function deleteSubtask(todoId: string, subId: string) {
    setTodos(prev => prev.map(t => t.id === todoId
      ? { ...t, subtasks: (t.subtasks ?? []).filter(s => s.id !== subId) } : t));
  }
  ```
- **마감 요약 파생값**:
  ```ts
  const dueTodayCount = todos.filter(t => !t.completed && isToday(t.dueDate)).length;
  const overdueCount = todos.filter(t => !t.completed && isOverdue(t.dueDate)).length;
  ```
- **백업 입출력**:
  ```ts
  function exportData(): Todo[] { return todos; }
  function importData(incoming: unknown): boolean {
    if (!Array.isArray(incoming)) return false;
    const ok = incoming.every((o: any) => o && typeof o.id === 'string' && typeof o.text === 'string');
    if (!ok) return false;
    setTodos(incoming as Todo[]);
    return true;
  }
  ```
- **return**에 추가: `query, setQuery, dueScope, setDueScope, dueTodayCount, overdueCount, addSubtask, toggleSubtask, deleteSubtask, exportData, importData`.

## 5. 검색 + 마감범위 칩 — `src/components/FilterBar.tsx`
- Props 추가: `query: string; setQuery: (v: string) => void; dueScope: DueScope; setDueScope: (v: DueScope) => void;`
- 상단에 검색 input:
  ```tsx
  <input className="filter-bar__search" type="search" placeholder="검색 (제목·카테고리)"
    value={query} onChange={e => setQuery(e.target.value)} />
  ```
- 마감범위 칩(전체/오늘/이번주/지연 → `setDueScope`). 기존 `filter-bar__sort-btn` 버튼 + active 토글 패턴 재사용.
- `App.tsx`에서 새 props 전달.

## 6. 마감 요약 배너 — 신규 `src/components/DueSummary.tsx`
```tsx
interface Props { dueTodayCount: number; overdueCount: number; onJump: (scope: 'today' | 'overdue') => void; }
export default function DueSummary({ dueTodayCount, overdueCount, onJump }: Props) {
  if (dueTodayCount === 0 && overdueCount === 0) return null;
  return (
    <div className="due-summary">
      {overdueCount > 0 && (
        <button type="button" className="due-summary__item due-summary__item--overdue" onClick={() => onJump('overdue')}>⚠ 지연 {overdueCount}</button>
      )}
      {dueTodayCount > 0 && (
        <button type="button" className="due-summary__item due-summary__item--today" onClick={() => onJump('today')}>오늘 마감 {dueTodayCount}</button>
      )}
    </div>
  );
}
```
`App.tsx`: `onJump={(scope) => setDueScope(scope)}`. `FilterBar` 근처에 렌더.

## 7. 서브태스크 UI — `src/components/TodoItem.tsx` + `TodoList.tsx`
- `TodoList` Props에 `onAddSubtask/onToggleSubtask/onDeleteSubtask` 추가 → `TodoItem`으로 전달. `App.tsx`에서도 연결.
- `TodoItem`(뷰 모드) `todo-item__body` 아래 서브태스크 영역:
  - 진행도: `const done = (todo.subtasks ?? []).filter(s => s.completed).length; const total = (todo.subtasks ?? []).length;` → `total>0`이면 `{done}/{total}` 표시.
  - 각 서브태스크: 체크박스(`onToggleSubtask`) + 텍스트 + 삭제 버튼(`onDeleteSubtask`).
  - "하위 항목 추가" 작은 input + 버튼(로컬 state, Enter/버튼 → `onAddSubtask(todo.id, text)` 후 비움).
- `isOverdue`/`formatDate`는 `../utils/date`에서 import로 교체(중복 제거).

## 8. 백업 + 다크모드 툴바 — 신규 `src/components/AppToolbar.tsx`
`App.tsx` 헤더 영역 배치.
- **내보내기**: `exportData()` 결과 → `JSON.stringify` → `new Blob([...], { type: 'application/json' })` → `URL.createObjectURL` → 임시 `<a download="todolist-backup-YYYYMMDD.json">` 클릭 → `revokeObjectURL`.
- **가져오기**: 숨김 `<input type="file" accept="application/json">` → `FileReader.readAsText` → `JSON.parse` → `importData(parsed)`. 성공/실패를 기존 `Toast`로 알림.
- **다크모드 토글**: `usePersistentState<'light'|'dark'>('todolist-pref-theme', 'light')`, `useEffect`로 `document.body.dataset.theme = theme === 'dark' ? 'dark' : ''`. 버튼 라벨/아이콘 토글.

## 9. 다크모드 변수 보완 — `src/styles/abstracts/_variables.scss`
기존 `[data-theme="dark"]` 블록 보강(전체 화면이 자연스럽게 어두워지게):
```scss
[data-theme="dark"] {
  --txt-color-base: #ddd; --txt-color-tit: #fff; --txt-color-form: #aaa; --txt-color-active: #fff;
  --color-white: #1a1a1a; --color-black: #fff; --color-border: #333;
  --color-main-5: #20262b; --color-main-10: #243038; --color-main-20: #2d3d48;
}
```
컴포넌트 SCSS의 하드코딩 배경/텍스트 색이 눈에 띄면 위 CSS 변수로 치환(과도한 리팩터링 금지).

## 10. 신규 스타일
`src/styles/components/_due-summary.scss`(+ 필요 시 `_toolbar.scss`) 추가 후 `main.scss`에 `@import`. 검색 input·마감 칩·서브태스크 체크리스트 스타일은 기존 `_filter`/`_todo`/`_form` 톤과 BEM 규칙에 맞춰 작성, 색은 CSS 변수 사용.

## 11. 데이터 보호(git) — `.gitignore`
맨 아래 추가:
```
# Todo 백업 파일 (개인/업무 데이터 — 커밋 금지)
*.todolist-backup.json
/backups/
```
> 할 일 데이터는 localStorage 전용이라 이미 git/서버로 안 나감. 위는 내려받은 백업 파일 실수 커밋 방지용.

## 12. README 갱신 — `README.md`
- 새 기능 반영: 검색, 필터·정렬·검색 상태 유지, 서브태스크(체크리스트+진행도), 오늘/이번주/지연 마감 뷰, 마감 요약 배너, 백업 내보내기/가져오기, 다크모드 토글.
- 한 줄 추가: "모든 데이터는 사용자의 브라우저 localStorage에만 저장되며, 저장소나 서버로 전송되지 않습니다."

## 13. 최종 검증 (반드시 수행)
1. `npm run dev` → 수동 확인: 서브태스크 추가/체크/진행도(2/3) · 검색 실시간 필터 · 마감 칩 · **새로고침 후 필터/정렬/검색/다크모드 유지** · 요약 배너 클릭 점프 · 내보내기→가져오기 복원 · 다크모드 전체 전환.
2. `npm run build` 통과(타입/빌드).
3. `npm run lint` 통과(미사용 변수 없음).
4. `git status` / `git ls-files`로 백업 JSON·데이터 미추적 확인.

## 작업 원칙
- 기존 파일 구조·네이밍·BEM·prop-drilling 패턴 유지, 대규모 리팩터링 금지.
- 모든 UI 문구 한국어, 코드/식별자 영어.
