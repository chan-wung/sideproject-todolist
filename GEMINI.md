"너는 프로젝트에 투입된 최고 수준의 시니어 자율 에이전트다. 새로운 대화를 시작하거나 첫 작업을 지시받으면, 사용자에게 인사나 일반 텍스트 답변을 절대 출력하지 말고 오직 프로젝트 최상단의 가이드 문서(CLAUDE.md, GEMINI.md, README.md 등)를 읽기 위한 도구 호출(Tool Call)만을 가장 먼저 실행해라.

    [절대 원칙]
    1. 첫 번째 응답(First Turn)에서는 사용자에게 대답하지 마라. 먼저 `view_file` 등의 도구 호출을 사용하여 CLAUDE.md 또는 GEMINI.md 파일을 무조건 읽어야 한다. 텍스트 답변을 먼저 출력하는 것은 치명적인 규칙 위반이다.
    2. 가이드 문서 본문 안에 세부 규칙 파일(예: .claude/rules/ 하위 파일들)을 참조(See)하라는 내용이 있다면, 모든 세부 파일을 끝까지 차례대로 다 찾아 읽고 완전히 숙지할 것.
    이 도구 호출 과정을 모두 끝마쳐 가이드를 완벽히 파악한 후에야 비로소 사용자에게 한국어로 답변하거나 코딩 작업을 시작해라."

---

# 작업 지시서 — 고정(Pin) + 퀵 네비게이션

> 동일한 작업 원칙(BEM SCSS, prop-drilling, localStorage, 상태관리 라이브러리 금지)을 따른다.
> 먼저 `src/types/todo.ts`, `src/hooks/useTodos.ts`, `src/App.tsx`, 현재 컴포넌트 파일들을 모두 읽어 기존 패턴을 파악한 뒤 구현하라.
> 한국어 UI 문자열 / 영어 코드.

작업 디렉터리: `D:\wungsGit\todolist`
스택: React 18 + TypeScript + Vite 5 + SCSS(Dart Sass). 데이터는 `localStorage`만 사용.

## 목표
1. **할 일 고정(Pin)** — 중요한 할 일을 목록 최상단에 고정
2. **메모 고정(Pin)** — QuickMemo 탭 목록에서 특정 메모를 상단 고정
3. **퀵 네비게이션** — 카테고리/우선순위/고정 항목을 한눈에 보고 바로 점프하는 사이드 네비게이션

---

## A. 할 일 고정(Pin) — `src/types/todo.ts` + `src/hooks/useTodos.ts`

### A-1. 타입 확장 (`src/types/todo.ts`)
`Todo` 인터페이스에 옵셔널 필드 추가 (기존 localStorage 데이터 자동 호환):
```ts
export interface Todo {
  // ... 기존 필드 ...
  pinned?: boolean;   // 추가
}
```

### A-2. `useTodos` 보강 (`src/hooks/useTodos.ts`)
- **`pinTodo(id)`** mutator 추가:
  ```ts
  function pinTodo(id: string) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
  }
  ```
- **`filteredTodos` 정렬 수정**: 기존 sort 로직 앞에 고정 항목이 항상 먼저 오도록:
  ```ts
  .sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // 이하 기존 로직(priority / dueDate / default) 그대로
  })
  ```
- **`allTodos: todos`** 를 return 객체에 추가 (QuickNav에서 원본 배열 필요).
- `return` 객체에 `pinTodo` 도 추가.

### A-3. `TodoItem` UI (`src/components/TodoItem.tsx`)
- Props에 `onPin: (id: string) => void` 추가.
- 액션 버튼 영역(`todo-item__actions`)에 핀 버튼 추가 (수정·삭제 버튼 왼쪽):
  ```tsx
  <button
    type="button"
    className={`todo-item__btn todo-item__btn--pin${todo.pinned ? ' todo-item__btn--pin-active' : ''}`}
    onClick={() => onPin(todo.id)}
    aria-label={todo.pinned ? '고정 해제' : '상단 고정'}
  >
    <svg viewBox="0 0 24 24" fill={todo.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  </button>
  ```
- 고정된 항목은 `todo-item--pinned` modifier 클래스 추가 (시각적 강조용).
- `TodoList.tsx`에도 `onPin` prop 추가해 전달. `App.tsx`에서 `pinTodo` 연결.

---

## B. 메모 고정(Pin) — `src/components/QuickMemo.tsx`

> **중요**: F 섹션(드래그 앤 드롭)과 함께 구현한다. 핀은 자동 정렬이 아닌 **시각적 강조만** 담당하고, 순서는 드래그가 결정한다.

현재 `Memo` 인터페이스에 `pinned?: boolean` 추가:
```ts
interface Memo { id: string; title: string; content: string; pinned?: boolean; }
```

- **핀 토글 함수** 추가:
  ```ts
  function toggleMemoPin(id: string) {
    setMemos(memos.map(m => m.id === id ? { ...m, pinned: !m.pinned } : m));
  }
  ```
- **`filteredMemos`**: 검색 필터만 적용, **자동 정렬 없음** — 순서는 `memos` 배열 순서(드래그로 결정)를 그대로 따른다:
  ```ts
  const filteredMemos = memos.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  ```
- **각 메모 탭 UI**: 삭제 버튼 왼쪽에 핀 버튼 추가:
  ```tsx
  <button
    type="button"
    className={`quick-memo-modal__item-pin${m.pinned ? ' quick-memo-modal__item-pin--active' : ''}`}
    onClick={(e) => { e.stopPropagation(); toggleMemoPin(m.id); }}
    aria-label={m.pinned ? '고정 해제' : '메모 고정'}
  ><span aria-hidden="true">📌</span></button>
  ```
  고정된 메모 탭에는 `quick-memo-modal__item--pinned` modifier 추가 (색상/굵기 강조).

---

## C. 퀵 네비게이션 패널

### C-1. 신규 컴포넌트 `src/components/QuickNav.tsx`

화면 왼쪽 또는 `FilterBar` 위에 접이식 패널로 렌더. `App.tsx`에서 `useTodos()` 반환값을 받아 prop으로 전달.

**Props:**
```ts
interface Props {
  allTodos: Todo[];
  onJumpCategory: (cat: string) => void;
  onJumpPinned: () => void;
  setDueScope: (s: DueScope) => void;
  setSortKey: (k: SortKey) => void;
  setFilterStatus: (s: FilterStatus) => void;
  dueTodayCount: number;
  overdueCount: number;
}
```

**렌더 구조 (BEM: `quick-nav`):**
```
quick-nav
  quick-nav__section  (고정 항목)
    quick-nav__section-tit  "고정 할 일"
    quick-nav__list
      quick-nav__item  (핀된 todo 텍스트, 클릭 시 onJumpPinned)
  quick-nav__section  (마감)
    quick-nav__section-tit  "마감"
    quick-nav__item  "오늘 마감 N"  → setDueScope('today')
    quick-nav__item  "지연 N"       → setDueScope('overdue')
  quick-nav__section  (카테고리)
    quick-nav__section-tit  "카테고리"
    quick-nav__item × N    → onJumpCategory(cat)  (각 카테고리별 미완료 개수 표시)
  quick-nav__section  (우선순위)
    quick-nav__section-tit  "우선순위"
    quick-nav__item  "높음 N" → setSortKey('priority'); setFilterStatus('active')
    quick-nav__item  "보통 N"
    quick-nav__item  "낮음 N"
```

각 `quick-nav__item`의 카운트는 `allTodos`에서 직접 계산:
```ts
const pinnedActive = allTodos.filter(t => t.pinned && !t.completed);
const catCounts = Object.fromEntries(
  [...new Set(allTodos.map(t => t.category))].map(cat => [
    cat, allTodos.filter(t => t.category === cat && !t.completed).length
  ])
);
const priorityCounts = { high: 0, medium: 0, low: 0 };
allTodos.filter(t => !t.completed).forEach(t => priorityCounts[t.priority]++);
```

### C-2. `App.tsx` 연결
- `QuickNav`를 헤더 버튼(예: "네비") 클릭 → `isNavOpen` 상태 → `todo-app__body` 안에 표시/숨김.
- `onJumpCategory` → `setFilterCategory(cat)`
- `onJumpPinned` → `setFilterStatus('active')` + `setDueScope('all')` + `setQuery('')`
- `allTodos` → `useTodos()` 반환 `allTodos`

### C-3. SCSS `src/styles/components/_quick-nav.scss`
`main.scss`에 `@import 'components/quick-nav'` 추가. 기존 `_sidebar.scss` 톤과 BEM 유지. 항목 호버 시 `--main-color` 강조, 카운트 배지는 `filter-bar__count` 스타일 참고.

---

## D. SCSS 추가 스타일

### `_todo.scss` 보강
```scss
.todo-item {
  &--pinned {
    border-left: 3px solid var(--color-sub);
    background: var(--color-main-5);
  }
  &__btn--pin { color: var(--txt-color-form); }
  &__btn--pin-active { color: var(--color-sub); }
}
```

### `_quick-memo.scss` 보강
```scss
.quick-memo-modal__item {
  &--pinned { font-weight: 700; border-left: 2px solid var(--color-sub); }
  &-pin { opacity: 0.4; }
  &-pin--active { opacity: 1; color: var(--color-sub); }
}
```

---

## F. 메모 탭 드래그 앤 드롭 — `src/components/QuickMemo.tsx`

> 라이브러리 추가 없이 **네이티브 HTML5 DnD API**로 구현한다. 새 npm 패키지 설치 금지.
> 드래그 순서가 `memos` 배열 순서를 직접 결정한다(B 섹션의 자동 정렬 없는 이유).

### F-1. 상태 추가
```ts
const [draggingId, setDraggingId] = useState<string | null>(null);
const [dragOverId, setDragOverId] = useState<string | null>(null);
```

### F-2. 핸들러 함수
```ts
function handleDragStart(id: string) {
  setDraggingId(id);
}

function handleDragOver(e: React.DragEvent, id: string) {
  e.preventDefault(); // drop 허용
  if (id !== draggingId) setDragOverId(id);
}

function handleDrop(targetId: string) {
  if (!draggingId || draggingId === targetId) {
    setDraggingId(null);
    setDragOverId(null);
    return;
  }
  const from = memos.findIndex(m => m.id === draggingId);
  const to   = memos.findIndex(m => m.id === targetId);
  if (from === -1 || to === -1) return;
  const next = [...memos];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  setMemos(next);
  setDraggingId(null);
  setDragOverId(null);
}

function handleDragEnd() {
  setDraggingId(null);
  setDragOverId(null);
}
```

### F-3. `<li>` 요소에 DnD 속성 적용
기존 `quick-memo-modal__list` 안의 `<li>` 에 추가:
```tsx
<li
  key={m.id}
  draggable
  onDragStart={() => handleDragStart(m.id)}
  onDragOver={(e) => handleDragOver(e, m.id)}
  onDrop={() => handleDrop(m.id)}
  onDragEnd={handleDragEnd}
  className={[
    'quick-memo-modal__item',
    m.id === activeId   ? 'quick-memo-modal__item--active'   : '',
    m.pinned            ? 'quick-memo-modal__item--pinned'   : '',
    m.id === draggingId ? 'quick-memo-modal__item--dragging' : '',
    m.id === dragOverId ? 'quick-memo-modal__item--drag-over': '',
  ].filter(Boolean).join(' ')}
  onClick={() => setActiveId(m.id)}
>
  {/* 드래그 핸들 (선택적 — 아이콘만) */}
  <span className="quick-memo-modal__drag-handle" aria-hidden="true">⠿</span>
  {/* 기존 내용 유지 */}
  ...
</li>
```

### F-4. `_quick-memo.scss` 드래그 스타일 추가
```scss
.quick-memo-modal {
  &__item {
    cursor: grab;
    &--dragging  { opacity: 0.4; cursor: grabbing; }
    &--drag-over { border-top: 2px solid var(--main-color); }
  }
  &__drag-handle {
    flex-shrink: 0;
    color: var(--color-border);
    font-size: 1.4rem;
    cursor: grab;
    user-select: none;
  }
}
```

---

## E. 최종 검증 (반드시 수행)
1. `npm run dev` → 수동 확인:
   - 할 일 고정 버튼 클릭 → 목록 최상단으로 이동 + 시각 강조
   - 고정 해제 → 원래 정렬로 복귀
   - 퀵 네비 열기 → 카테고리 클릭 → 해당 카테고리 필터 적용
   - 퀵 네비 "지연 N" 클릭 → dueScope 'overdue' 적용
   - 메모장 내 메모 핀 → 핀된 메모 시각 강조(굵기/색상), 순서는 드래그로 조정
   - 메모 탭 드래그 앤 드롭으로 순서 변경 → 새로고침 후 순서 유지
   - 새로고침 후 고정 상태·드래그 순서 모두 유지 (localStorage에 저장됨)
2. `npm run build` 통과.
3. `npm run lint` 통과 (미사용 변수 없음).

## 작업 원칙
- 기존 파일 구조·네이밍·BEM·prop-drilling 패턴 유지, 대규모 리팩터링 금지.
- 모든 UI 문구 한국어, 코드/식별자 영어.
