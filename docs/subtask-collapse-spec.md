# 하위항목(Subtask) 접기/펴기 기능 명세서

> 이 문서는 구현 담당 에이전트(agy)가 바로 착수할 수 있도록 작성된 기능 명세서입니다.
> 작성 시점 기준 코드 스냅샷을 근거로 하므로, 구현 전 관련 파일이 그 사이 변경되지 않았는지 먼저 확인하세요.
>
> **구현 완료 (2026-07-02)** — 아래 명세 전 항목 구현 확인, `npm run build` / `npm run lint` 통과.

## 1. 배경 / 문제 상황

`FilterBar`에서 정렬 방식을 **"직접 정렬"**(`sortKey === 'manual'`)로 바꾸면 `TodoItem`에 드래그 핸들이 나타나 마우스로 순서를 바꿀 수 있다. 그런데 각 할일(Todo)에 하위항목(subtask)이 여러 개 달려 있으면 리스트 한 칸의 세로 길이가 길어져서, 화면에 보이는 항목 수가 줄고 위·아래로 멀리 있는 항목끼리 드래그로 옮기기가 어렵다. HTML5 네이티브 Drag and Drop 기반이라 **드래그 중 화면 가장자리 자동 스크롤도 없어**(`src/components/TodoList.tsx`, `src/components/TodoItem.tsx` 모두 라이브러리 없이 직접 구현) 문제가 더 커진다.

해결책: 하위항목을 접어서 리스트를 압축하면 같은 화면에 더 많은 항목이 보이고 정렬이 쉬워진다. 요구 기능은 3가지다.

1. **전체 접기** — 하위항목이 있는 모든 할일의 하위항목을 한 번에 숨김
2. **전체 펴기** — 모두 다시 펼침
3. **개별 접기/펴기** — 할일 하나씩 하위항목 표시 여부를 토글

## 2. 현재 코드 구조 (구현 전 필수 파악 사항)

### 2.1 데이터 모델 — `src/types/todo.ts`
```ts
export interface Subtask { id: string; text: string; completed: boolean; }

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  category: string;
  createdAt: string;
  subtasks?: Subtask[];
  pinned?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  memoId?: string;
}
```
하위항목은 `parentId`/`depth` 방식이 아니라 부모 `Todo.subtasks` 배열에 **1단계로 중첩**되어 있다. 접힘 상태 필드는 아직 없다.

### 2.2 저장 방식 — `src/hooks/useTodos.ts`
```ts
const STORAGE_KEY = 'todolist-items';
function loadFromStorage(): Todo[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}
// ...
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}, [todos]);
```
`todos` state 전체가 매번 통째로 직렬화되어 저장된다. `Todo`에 필드를 추가하면 자동으로 이 저장 로직을 탄다.

같은 파일에 이미 존재하는 subtask 관련 함수들 (패턴 참고용):
- `addSubtask(todoId, text)` — L116
- `toggleSubtask(todoId, subId)` — L122 (⚠️ **이건 완료 체크 토글**이지 접힘과 무관. 이름 충돌 주의)
- `deleteSubtask(todoId, subId)` — L135
- `updateSubtask(todoId, subId, text)` — L146
- `reorderSubtasks(todoId, fromIndex, toIndex)` — L156

이 함수들은 모두 `setTodos(prev => prev.map(t => t.id === todoId ? {...t, ...} : t))` 패턴을 쓴다. 새 함수도 동일 패턴을 따를 것.

### 2.3 렌더링 — `src/components/TodoItem.tsx`
루트 컨테이너 클래스 (L198-208):
```tsx
<div
  id={`todo-item-${todo.id}`}
  className={[
    'todo-item',
    `todo-item--${todo.priority}`,
    todo.completed ? 'todo-item--completed' : '',
    overdue ? 'todo-item--overdue' : '',
    todo.pinned ? 'todo-item--pinned' : '',
  ].filter(Boolean).join(' ')}
>
```

진행도 배지, `.todo-item__meta` 안 (L260-262) — 토글 버튼을 붙이기 가장 자연스러운 위치:
```tsx
{total > 0 && (
   <span className="todo-item__sub-progress">진행도 {done}/{total}</span>
)}
```

하위항목 컨테이너, 접기 대상 영역 (L274):
```tsx
<div className="todo-item__subtasks">
  {(todo.subtasks ?? []).map((sub, index) => ( ... ))}
  <div className="todo-item__sub-add"> ... </div>
</div>
```

### 2.4 스타일 — `src/styles/components/_todo.scss`
서브태스크 섹션은 L839~1027. 관련 블록:
```scss
&__sub-progress {
  @include font(11, "Bold");
  color: var(--color-main);
  border: 1px solid var(--color-main);
  padding: rem(2) rem(8);
  border-radius: 12px;
  margin-left: auto;
}

&__subtasks {
  margin-top: rem(12);
  display: flex;
  flex-direction: column;
  gap: rem(6);
  padding-top: rem(12);
  border-top: 1px dashed var(--color-border);
}
```

### 2.5 목록/전역 배선 — `src/components/TodoList.tsx`, `src/App.tsx`
`App.tsx`는 `useTodos()`에서 함수를 꺼내 `TodoList`에 props로 넘기고, `TodoList`는 다시 각 `TodoItem`에 넘긴다(prop drilling, 상태관리 라이브러리 없음). 새 함수도 이 체인을 그대로 따라야 한다:
`useTodos.ts` (신규 함수 export) → `App.tsx` (구조분해 후 `TodoList`에 전달) → `TodoList.tsx` (다시 `TodoItem`에 전달) → `TodoItem.tsx` (사용).

`App.tsx`의 필터/정렬 컨트롤 바는 `FilterBar` 컴포넌트(`src/components/FilterBar.tsx`)이며, `TodoInput` 아래 `TodoList` 바로 위에 렌더된다(L249-278). 이미 "선택 모드", "완료 항목 삭제" 같은 **리스트 레벨 일괄 동작 버튼**이 이 바에 모여 있다. `AppToolbar`(`src/components/AppToolbar.tsx`)는 반대로 테마·백업(가져오기/내보내기)·설정 모달처럼 **앱 레벨 전역 기능**을 담당하며 리스트와 직접 관련이 없다.

→ **전체 접기/펴기 버튼은 `AppToolbar`가 아니라 `FilterBar`에 두는 것을 권장.** 이유: (a) 이미 리스트 관련 일괄 동작 버튼(`filter-bar__select-btn`, `filter-bar__clear-btn`)이 이 컴포넌트에 있어 관례상 자연스럽다, (b) `AppToolbar`는 `App.tsx` 최상단에서 `todo-app` 래퍼 바깥에 렌더되어 리스트와 시각적으로 멀다. `filter-bar__right` 영역(L81, 기존 선택 버튼 옆) 안에 버튼을 추가한다.

## 3. 기능 요구사항

| 기능 | 동작 |
|---|---|
| 전체 접기 | `subtasks`가 1개 이상인 모든 Todo의 접힘 상태를 `true`로 설정 |
| 전체 펴기 | 모든 Todo의 접힘 상태를 `false`로 설정 |
| 개별 토글 | 해당 Todo 하나의 접힘 상태만 반전 |

- **하위항목이 없는 Todo**(`subtasks`가 없거나 빈 배열)는 접기 대상이 아니다. 개별 토글 버튼을 표시하지 않는다. (기존에 `total > 0`일 때만 진행도 배지를 보여주는 조건과 동일한 기준 재사용)
- 접힘 상태에서 숨기는 범위는 **`.todo-item__subtasks` 블록 전체만**이다. 체크박스, 제목, `__meta`(배지/카테고리/마감일/진행도), `__actions`(고정/수정/삭제)는 항상 보인다.
- 편집 모드(`isEditing === true`, L117-196 분기)에서는 `__subtasks` 자체가 렌더되지 않으므로 접힘 상태와 무관하다. 별도 처리 불필요.

## 4. 데이터 모델 변경

`src/types/todo.ts`의 `Todo`에 필드 추가:
```ts
export interface Todo {
  // ...기존 필드
  subtasksCollapsed?: boolean; // 기본값 false(펼침). subtasks가 없는 Todo에는 의미 없음.
}
```
필드명은 `collapsed`보다 `subtasksCollapsed`를 권장(향후 다른 종류의 "접힘" 개념이 생겨도 충돌하지 않도록). `toggleSubtask`(완료 토글)와 이름이 겹치지 않게 함수명은 `toggleSubtasksCollapsed`처럼 명확히 구분할 것.

### 저장 방식 결정: localStorage 영구 저장 (권장)
`subtasksCollapsed`를 `Todo` 객체 필드로 두면 기존 `useEffect(() => localStorage.setItem(...), [todos])`가 그대로 적용되어 별도 저장 로직이 필요 없다. 새로고침/재접속 후에도 접힘 상태가 유지된다.

**대안(세션 전용):** 만약 "새로고침하면 항상 펼쳐진 상태로 시작"을 원한다면, `Todo` 필드로 두지 않고 `App.tsx` 또는 `TodoList.tsx`에서 `useState<Set<string>>`(접힌 todo id 집합)으로 별도 관리한다. 이 경우 `todolist-items`에는 저장되지 않고 새로고침 시 초기화된다. **기본은 영구 저장 방식으로 구현하되, 이 대안 존재를 인지할 것.**

## 5. 로직 구현 — `src/hooks/useTodos.ts`

`toggleSubtask` 함수(L122) 근처에 아래 3개 함수를 추가하고 반환 객체(L283~)에 포함시킨다:

```ts
function toggleSubtasksCollapsed(todoId: string) {
  setTodos(prev => prev.map(t =>
    t.id === todoId ? { ...t, subtasksCollapsed: !t.subtasksCollapsed } : t
  ));
}

function collapseAllSubtasks() {
  setTodos(prev => prev.map(t =>
    (t.subtasks && t.subtasks.length > 0) ? { ...t, subtasksCollapsed: true } : t
  ));
}

function expandAllSubtasks() {
  setTodos(prev => prev.map(t =>
    (t.subtasks && t.subtasks.length > 0) ? { ...t, subtasksCollapsed: false } : t
  ));
}
```

`return { ... }` 블록(L283-323)에 세 함수를 추가.

`withUndo`(실행취소 토스트)는 파괴적 동작(삭제)에만 쓰이는 패턴이므로 접기/펴기에는 적용하지 않는다. 즉각 반영이면 충분하다.

## 6. UI/마크업 명세

### 6.1 개별 토글 버튼 — `TodoItem.tsx`

`.todo-item__meta` 안, 기존 진행도 배지를 버튼으로 감싸거나 옆에 배치 (L260-262 자리):

```tsx
{total > 0 && (
  <button
    type="button"
    className="todo-item__sub-toggle"
    onClick={() => onToggleSubtasksCollapsed(todo.id)}
    aria-expanded={!todo.subtasksCollapsed}
    aria-controls={`todo-subtasks-${todo.id}`}
    aria-label={todo.subtasksCollapsed ? '하위 항목 펼치기' : '하위 항목 접기'}
  >
    <span className="todo-item__sub-progress">진행도 {done}/{total}</span>
    <svg
      className={`todo-item__sub-toggle-icon${todo.subtasksCollapsed ? ' todo-item__sub-toggle-icon--collapsed' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>
)}
```

`.todo-item__subtasks`에 `id`와 BEM modifier 클래스 부여 (L274). **완전히 unmount하지 말고 클래스로 숨길 것** — `aria-controls`가 항상 실제 DOM 요소를 가리켜야 스크린리더가 올바르게 인식한다:
```tsx
<div
  className={`todo-item__subtasks${todo.subtasksCollapsed ? ' todo-item__subtasks--collapsed' : ''}`}
  id={`todo-subtasks-${todo.id}`}
>
  {/* 기존 내용 그대로 */}
</div>
```
**⚠️ 인라인 `style={{ display: ... }}` 사용 금지.** `.claude/rules/scss.md`는 디자인/상태를 BEM modifier 클래스로만 해결하고 인라인 스타일을 지양하도록 규정한다. 숨김 처리는 반드시 SCSS의 `&--collapsed { display: none; }` 클래스로 할 것 (6.4 참고).

`Props` 인터페이스(L8-26)에 `onToggleSubtasksCollapsed: (id: string) => void;` 추가.

### 6.2 아이콘
프로젝트는 인라인 `<svg>` + `screen-out` 관례를 쓴다(외부 아이콘 라이브러리 없음). 위 예시처럼 chevron(꺾쇠) SVG를 인라인으로 두고 접힘 시 `transform: rotate(-90deg)`로 회전시키는 방식을 권장. `src/styles/abstracts/_icons.scss`의 `svgIcoArrowDown` 함수(배경 이미지 방식)도 대안이나, 이 프로젝트의 다른 토글류 버튼(수정/저장/취소, `__btn-sub-edit` 등)이 모두 인라인 `<svg>` stroke 방식이므로 일관성상 인라인 SVG를 권장.

### 6.3 전체 접기/펴기 — `FilterBar.tsx`

`Props`에 추가:
```ts
allCollapsed: boolean; // 표시용: 하위항목 있는 항목이 모두 접혀있는지
onCollapseAll: () => void;
onExpandAll: () => void;
```
`filter-bar__right`(L81) 안, 기존 `filter-bar__select-btn` 옆에 버튼 2개 또는 토글 1개 추가:
```tsx
<button type="button" className="filter-bar__collapse-btn" onClick={onCollapseAll}>
  전체 접기
</button>
<button type="button" className="filter-bar__collapse-btn" onClick={onExpandAll}>
  전체 펴기
</button>
```
**대안:** 버튼 2개 대신 아이콘 토글 1개(`filter-bar__collapse-btn--active` modifier로 상태 표시)로 압축 가능. 팀 취향에 따라 선택.

하위항목이 있는 Todo가 하나도 없으면(전체 리스트에 subtask 없음) 버튼을 숨기거나 비활성화하는 것을 권장(빈 동작 방지).

### 6.4 SCSS — `src/styles/components/_todo.scss` / `_filter-bar.scss`(있다면 해당 파일)

`.claude/rules/scss.md` 규칙 준수: BEM 중첩 3단계 이내, 색상은 `var(--*)` CSS 변수, 폰트는 `@include font()`만 사용, `!important` 금지, 속성 순서(Box Model → Layout → Design → Typo&Pos) 엄수.

`_todo.scss`의 기존 `&__sub-progress`(L840) 블록 근처에 추가 예시:
```scss
&__sub-toggle {
  display: flex;
  align-items: center;
  gap: rem(4);
  margin-left: auto;
  background: transparent;
  border: none;
  cursor: pointer;
  @include transition();
}

&__sub-toggle-icon {
  width: rem(12);
  height: rem(12);
  color: var(--color-main);
  @include transition(transform);

  &--collapsed {
    transform: rotate(-90deg);
  }
}

&__subtasks {
  // 기존 margin-top/gap/padding-top/border-top 유지

  &--collapsed {
    display: none;
  }
}
```
`FilterBar` 쪽 버튼은 기존 `.filter-bar__select-btn` 스타일(파일 내 검색해서 위치 확인) 옆에 유사한 톤으로 추가.

## 7. 접근성
- 토글 버튼: `aria-expanded`(펼침 여부), `aria-controls`(대상 `id`와 매칭), `aria-label`(상태별 한국어 라벨)
- `screen-out` 텍스트는 버튼 라벨이 이미 `aria-label`로 제공되므로 필수는 아니나, 프로젝트 관례상 시각 숨김 텍스트를 병기해도 무방
- 전체 접기/펴기 버튼도 명확한 텍스트 라벨 사용(아이콘만 쓸 경우 `aria-label` 필수)

## 8. 엣지 케이스
- **하위항목이 없는 Todo**: 토글 버튼 미표시, `collapseAllSubtasks`/`expandAllSubtasks`에서도 자동 제외(위 로직에 `subtasks.length > 0` 조건 포함됨)
- **하위항목을 새로 추가할 때**: 접힌 상태에서 `addSubtask` 호출 시 자동으로 펼칠지 여부. 권장: 자동 펼침(추가한 항목이 바로 안 보이면 혼란스러움). `addSubtask` 성공 시 `subtasksCollapsed: false`도 함께 세팅하거나, `TodoItem`에서 `onAddSubtask` 호출 직후 로컬에서 펼침 처리.
- **QuickNav 점프**(`src/components/QuickNav.tsx`, `scrollIntoView`로 `#todo-item-{id}`로 이동): 접힌 항목은 하위항목이 안 보이므로 상관없음(제목/메타만 봐도 충분). 별도 자동 펼침 처리는 필수 아님 — 필요시 추가 검토.
- **직접 정렬(드래그) 중**: 접힌 상태는 유지된 채로 상위 Todo 자체만 드래그되면 된다(하위항목 드래그는 `__subtasks`가 렌더되지 않으므로 자연히 비활성). 별도 처리 불필요.
- **완료된 Todo**(`todo-item--completed`): 접기/펴기와 무관하게 독립 동작. 완료된 항목도 하위항목 있으면 토글 가능.

## 9. 검증 방법
1. `npm run dev`로 로컬 구동
2. 하위항목이 있는 할일을 2~3개 만들고 개별 토글 버튼으로 접기/펴기 확인 — 체크박스/제목/배지/액션 버튼은 계속 보이는지 확인
3. 전체 접기/펴기 버튼으로 리스트 전체 토글 확인, 하위항목 없는 항목은 영향받지 않는지 확인
4. 새로고침 후 접힘 상태가 유지되는지 확인(localStorage 영구 저장 선택 시)
5. 정렬을 "직접 정렬"로 바꾼 뒤 접은 상태에서 리스트가 짧아져 드래그 정렬이 실제로 쉬워지는지 확인(원래 문제 해결 여부)
6. `npm run build`(`tsc -b && vite build`)로 타입 에러 없는지 확인
7. `.claude/rules/html.md`, `.claude/rules/scss.md` 규칙(BEM, `<button type="button">`, `screen-out`, 색상/폰트 변수·믹스인 사용) 준수 여부 육안 검토
