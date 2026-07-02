# [완료] 할 일당 메모 여러 개 연결(Multi-memo Link) 기능 명세서

> 이 문서는 구현 담당 에이전트(agy)가 바로 착수할 수 있도록 작성된 기능 명세서입니다.
> 작성 시점 기준 코드 스냅샷을 근거로 하므로, 구현 전 관련 파일이 그 사이 변경되지 않았는지 먼저 확인하세요.

## 1. 배경 / 문제 상황

지금 `Todo.memoId?: string`는 할 일 하나에 메모(QuickMemo 기능의 메모)를 **딱 하나만** 연결할 수 있게 되어 있다. 최근 세션에서 "할 일 ↔ 메모 연결" 기능 자체와, 그 발견성을 높이는 UI(카드의 📎 배지, 빈 상태 안내 버튼), 그리고 QuickMemo 쪽에서 반대로 할 일을 연결하는 UI까지 구현했는데, 전부 단일 `memoId` 필드를 전제로 짜여 있다.

`BACKLOG.md` 5번 항목("할 일당 메모 여러 개 연결")에 "대부분의 경우 할 일 하나에 메모 하나로 충분해서 실제 수요 확인 후 진행 권장"이라고 적어뒀는데, 이번에 실제로 진행하기로 했다. 목표는 `memoId?: string` → `memoIds?: string[]`로 스키마를 바꿔서, 할 일 하나에 메모를 여러 개 연결/해제할 수 있게 만드는 것.

이 코드베이스에는 아직 스키마 마이그레이션 사례가 없다(`loadFromStorage`가 raw `JSON.parse`만 함). 기존 사용자의 localStorage와 내보내기(export) JSON 백업에 남아있는 `memoId: string` 데이터를 깨지지 않게 새 포맷으로 변환하는 것도 이번 작업의 핵심 범위다.

## 2. 현재 코드 구조 (구현 전 필수 파악 사항)

### 2.1 데이터 모델 — `src/types/todo.ts`
```ts
export interface Todo {
  // ...기존 필드
  memoId?: string;
}
```

### 2.2 저장/조회 로직 — `src/hooks/useTodos.ts`
마이그레이션이 필요한 진입점 3곳:

```ts
// L11-18
function loadFromStorage(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
```
```ts
// L194-201
function importData(incoming: unknown): boolean {
  if (!Array.isArray(incoming)) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = incoming.every((o: any) => o && typeof o.id === 'string' && typeof o.text === 'string');
  if (!ok) return false;
  setTodos(incoming as Todo[]);
  return true;
}
```
```ts
// L192
function exportData(): Todo[] { return todos; }
```

단일 필드를 다루는 로직 2곳:

```ts
// L104
function updateTodo(id: string, updates: Partial<Pick<Todo, 'text' | 'priority' | 'dueDate' | 'category' | 'recurrence' | 'memoId'>>) {
```
```ts
// L292-305
const pruneMemoLinks = useCallback((validMemoIds: string[]) => {
  const validSet = new Set(validMemoIds);
  setTodos(prev => {
    let changed = false;
    const next = prev.map(t => {
      if (t.memoId && !validSet.has(t.memoId)) {
        changed = true;
        return { ...t, memoId: undefined };
      }
      return t;
    });
    return changed ? next : prev;
  });
}, []);
```
`pruneMemoLinks`는 `App.tsx`의 `useEffect(() => { pruneMemoLinks(memos.map(m => m.id)); }, [memos, pruneMemoLinks])`(L69-71)에서 메모 목록이 바뀔 때마다(주로 메모 삭제 시) 호출되어, 삭제된 메모를 가리키는 연결을 정리하는 유일한 청소 로직이다.

같은 파일에 이미 존재하는 **배열 필드 조작 패턴** (참고용 — 새 함수도 이 패턴을 그대로 따를 것):
```ts
// L116-121 — 배열에 추가하는 패턴
function addSubtask(todoId: string, text: string) {
  if (!text.trim()) return;
  setTodos(prev => prev.map(t => t.id === todoId
    ? { ...t, subtasks: [...(t.subtasks ?? []), { id: generateId(), text: text.trim(), completed: false }], subtasksCollapsed: false }
    : t));
}
```
```ts
// L159-168 — 배열에서 제거하는 패턴
function deleteSubtask(todoId: string, subId: string) {
  withUndo('하위 항목을 삭제했습니다.', prev => prev.map(t => {
    if (t.id === todoId) {
      const newSubtasks = (t.subtasks ?? []).filter(s => s.id !== subId);
      const allCompleted = newSubtasks.length > 0 ? newSubtasks.every(s => s.completed) : false;
      return { ...t, subtasks: newSubtasks, completed: allCompleted };
    }
    return t;
  }));
}
```
`return { ... }` 블록(L307-351)에 신규 함수를 추가해서 export해야 한다.

### 2.3 렌더링 — `src/components/TodoItem.tsx`
Props 타입(L19)에 `memoId`가 박혀 있음:
```ts
onUpdate: (id: string, updates: Partial<Pick<Todo, 'text' | 'priority' | 'dueDate' | 'category' | 'recurrence' | 'memoId'>>) => void;
```
로컬 편집 state(L51):
```ts
const [editMemoId, setEditMemoId] = useState(todo.memoId ?? '');
```
`handleEditStart`(L69)에서 리셋, `handleSave`(L81)에서 커밋 — 다른 편집 필드(우선순위/마감일/카테고리/반복주기)와 함께 **배치 저장**(저장 버튼 한 번에 전체 반영)되는 흐름의 일부다.

수정 모드의 단일 `<select>`(L177-189):
```tsx
<div className="todo-item__edit-group">
  <label className="todo-item__edit-label">연결 메모</label>
  <select
    className="todo-item__edit-select"
    value={editMemoId}
    onChange={e => setEditMemoId(e.target.value)}
  >
    <option value="">연결 안 함</option>
    {memos.map(m => (
      <option key={m.id} value={m.id}>{m.title || '제목 없음'}</option>
    ))}
  </select>
</div>
```
카드에 표시되는 배지(L117 조회 + L294-311 렌더):
```ts
const linkedMemo = todo.memoId ? memos.find(m => m.id === todo.memoId) : undefined;
```
```tsx
{linkedMemo ? (
  <button type="button" className="todo-item__memo-link" onClick={() => onOpenMemo(linkedMemo.id)}>
    📎 {linkedMemo.title || '제목 없음'}
  </button>
) : (
  <button type="button" className="todo-item__memo-link todo-item__memo-link--empty" onClick={handleEditStart} aria-label="메모 연결">
    📎 메모 연결
  </button>
)}
```
이 블록은 `.todo-item__meta`(`display:flex; flex-wrap:wrap;`, L681) 안에 있다 — 여러 배지를 나열해도 자동으로 줄바꿈된다.

체크박스 마크업 참고 패턴(이미 프로젝트에서 쓰는 관례, L401-407 하위항목 체크박스):
```tsx
<label className="form-chk form-chk--checkbox">
  <input
    type="checkbox"
    checked={sub.completed}
    onChange={() => onToggleSubtask(todo.id, sub.id)}
  />
  <span className="form-chk__text">{sub.text}</span>
</label>
```

### 2.4 QuickMemo 쪽 연결 — `src/components/QuickMemo.tsx`
Props(L15):
```ts
onUpdateTodo: (id: string, updates: Partial<Pick<Todo, 'memoId'>>) => void;
```
연결 함수(L61-65) — 기존 연결을 **덮어쓴다**(다중 지원 시 문제가 되는 지점):
```ts
function handleLinkTodo() {
  if (!selectedTodoId || !activeId) return;
  onUpdateTodo(selectedTodoId, { memoId: activeId });
  setSelectedTodoId('');
}
```
필터(L145-146):
```ts
const linkedTodos = todos.filter(t => t.memoId === activeId);
const linkableTodos = todos.filter(t => t.memoId !== activeId);
```
"연결된 할 일" UI(L229-268, 요약) — 언링크 버튼이 `onUpdateTodo(t.id, { memoId: undefined })`(L239)로 전체를 지운다:
```tsx
<div className="quick-memo-modal__linked">
  <span className="quick-memo-modal__linked-tit">📎 연결된 할 일</span>
  {linkedTodos.length > 0 && (
    <ul className="quick-memo-modal__linked-list">
      {linkedTodos.map(t => (
        <li key={t.id} className="quick-memo-modal__linked-item">
          <span className="quick-memo-modal__linked-text">{t.text}</span>
          <button type="button" className="quick-memo-modal__linked-unlink"
            onClick={() => onUpdateTodo(t.id, { memoId: undefined })} aria-label="연결 해제">
            <span aria-hidden="true">&times;</span>
          </button>
        </li>
      ))}
    </ul>
  )}
  <div className="quick-memo-modal__linked-add">
    <select className="quick-memo-modal__linked-select" value={selectedTodoId} onChange={e => setSelectedTodoId(e.target.value)}>
      <option value="">연결할 할 일 선택...</option>
      {linkableTodos.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
    </select>
    <button type="button" className="quick-memo-modal__linked-add-btn" onClick={handleLinkTodo} disabled={!selectedTodoId}>연결</button>
  </div>
</div>
```

### 2.5 배선 — `src/App.tsx`, `src/components/TodoList.tsx`
`App.tsx`는 `useTodos()`에서 `pruneMemoLinks`(L45)를 꺼내 `useEffect`(L69-71)로 연결하고, `updateTodo`/`allTodos`를 `<QuickMemo>`(L315-324)에 `onUpdateTodo={updateTodo}`(L323)로 전달한다. `TodoList.tsx`(L16)는 `onUpdate`의 Pick 타입만 그대로 통과시키는 순수 pass-through다.

## 3. 기능 요구사항

| 기능 | 동작 |
|---|---|
| 할 일 하나에 메모 여러 개 연결 | 수정 모드 체크박스 목록에서 다중 선택, 저장 시 한 번에 반영 |
| QuickMemo에서 할 일에 메모 연결 | "연결된 할 일" 섹션에서 할 일 선택 후 연결 — 기존 연결을 덮어쓰지 않고 추가됨 |
| 개별 연결 해제 | 카드 배지 클릭이 아니라 수정 모드 체크 해제, 또는 QuickMemo의 × 버튼으로 특정 메모 하나만 해제 |
| 중복 연결 방지 | 이미 연결된 메모를 다시 연결해도 중복 배지가 생기지 않음 |
| 메모 삭제 시 정리 | 삭제된 메모에 대한 연결만 제거되고, 같은 할 일의 다른 메모 연결은 유지됨 (`pruneMemoLinks`) |
| 기존 데이터 호환 | 구버전 localStorage(`memoId: string`)와 구버전 백업 JSON을 불러와도 깨지지 않고 새 포맷으로 자동 변환됨 |

- 메모가 하나도 연결 안 된 할 일은 카드에 기존 빈 상태 버튼(`📎 메모 연결`)이 그대로 뜬다.
- 메모가 없는 상태(QuickMemo에 메모가 하나도 없음)에서는 수정 모드 체크박스 목록에 "메모 없음" 안내만 표시한다.

## 4. 데이터 모델 변경

`src/types/todo.ts`:
```ts
export interface Todo {
  // ...기존 필드
  memoIds?: string[]; // 기본값 없음(연결 없음 = 필드 자체가 undefined). 구버전 memoId 필드는 로드/가져오기 시 자동 변환됨.
}
```

**빈 상태 표현 규칙(반드시 지킬 것): "연결된 메모 없음"은 항상 `undefined`(키 자체를 지움), 절대 `[]`로 남기지 않는다.** `dueDate`/`recurrence` 등 기존 optional 필드 관례와 통일하기 위함. 읽을 때는 항상 `todo.memoIds ?? []`로 안전하게 처리한다.

## 5. 로직 구현 — `src/hooks/useTodos.ts`

### 5.1 마이그레이션 헬퍼 (신규, 파일 최상단 `loadFromStorage` 위에 추가)
```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateTodo(raw: any): Todo {
  const { memoId, ...rest } = raw;
  if (Array.isArray(rest.memoIds)) {
    return rest as Todo; // 이미 신규 포맷 — 그대로 통과 (idempotent)
  }
  if (typeof memoId === 'string' && memoId) {
    return { ...rest, memoIds: [memoId] } as Todo;
  }
  return rest as Todo;
}
```

### 5.2 `loadFromStorage` 수정
```ts
function loadFromStorage(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw ? (JSON.parse(raw) as any[]).map(migrateTodo) : [];
  } catch {
    return [];
  }
}
```

### 5.3 `importData` 수정 (L194-201)
`id`/`text` 검증 통과 후, `setTodos(incoming as Todo[])`를 `setTodos((incoming as any[]).map(migrateTodo))`로 교체.

### 5.4 `updateTodo` 시그니처 (L104)
`Partial<Pick<Todo, ...>>`의 `'memoId'`를 `'memoIds'`로 교체.

### 5.5 `pruneMemoLinks` 배열 대응 재작성 (L292-305)
```ts
const pruneMemoLinks = useCallback((validMemoIds: string[]) => {
  const validSet = new Set(validMemoIds);
  setTodos(prev => {
    let changed = false;
    const next = prev.map(t => {
      if (!t.memoIds || t.memoIds.length === 0) return t;
      const filtered = t.memoIds.filter(id => validSet.has(id));
      if (filtered.length === t.memoIds.length) return t;
      changed = true;
      return { ...t, memoIds: filtered.length > 0 ? filtered : undefined };
    });
    return changed ? next : prev;
  });
}, []);
```

### 5.6 신규 함수 — `addSubtask`/`deleteSubtask` 패턴 그대로 따름
`linkMemoToTodo` 함수는 `addSubtask` 근처, `unlinkMemoFromTodo`는 `deleteSubtask` 근처에 추가:
```ts
function linkMemoToTodo(todoId: string, memoId: string) {
  setTodos(prev => prev.map(t => {
    if (t.id !== todoId) return t;
    if ((t.memoIds ?? []).includes(memoId)) return t; // 중복 방지
    return { ...t, memoIds: [...(t.memoIds ?? []), memoId] };
  }));
}

function unlinkMemoFromTodo(todoId: string, memoId: string) {
  setTodos(prev => prev.map(t => {
    if (t.id !== todoId) return t;
    const filtered = (t.memoIds ?? []).filter(id => id !== memoId);
    return { ...t, memoIds: filtered.length > 0 ? filtered : undefined };
  }));
}
```
`return { ... }`(L307)에 `linkMemoToTodo`, `unlinkMemoFromTodo` 추가.

`withUndo`는 파괴적 삭제(할 일 삭제, 하위 항목 삭제)에만 쓰는 패턴이므로 메모 연결/해제에는 적용하지 않는다(기존 `pruneMemoLinks`도 undo 미적용).

## 6. UI/마크업 명세

### 6.1 수정 모드 — 체크박스 목록으로 교체 (`TodoItem.tsx`)
State(L51)와 리셋/저장 로직(L69, L81) 교체:
```ts
const [editMemoIds, setEditMemoIds] = useState<string[]>(todo.memoIds ?? []);
// ...
function handleEditStart() {
  // ...기존 리셋들
  setEditMemoIds(todo.memoIds ?? []);
  setIsEditing(true);
}

function toggleEditMemo(id: string) {
  setEditMemoIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
}

function handleSave() {
  if (!editText.trim()) return;
  onUpdate(todo.id, {
    // ...기존 필드들
    memoIds: editMemoIds.length > 0 ? editMemoIds : undefined,
  });
  setIsEditing(false);
}
```
마크업(L177-189 교체):
```tsx
<div className="todo-item__edit-group">
  <label className="todo-item__edit-label">연결 메모</label>
  {memos.length > 0 ? (
    <div className="todo-item__memo-checklist">
      {memos.map(m => (
        <label key={m.id} className="form-chk form-chk--checkbox">
          <input
            type="checkbox"
            checked={editMemoIds.includes(m.id)}
            onChange={() => toggleEditMemo(m.id)}
          />
          <span className="form-chk__text">{m.title || '제목 없음'}</span>
        </label>
      ))}
    </div>
  ) : (
    <p className="todo-item__memo-empty">메모 없음</p>
  )}
</div>
```

### 6.2 카드 배지 — 0..n개 렌더 (`TodoItem.tsx`)
조회 로직(L117) 교체:
```ts
const linkedMemos = (todo.memoIds ?? [])
  .map(id => memos.find(m => m.id === id))
  .filter((m): m is Memo => m !== undefined);
```
표시 로직(L294-311) 교체:
```tsx
{linkedMemos.length > 0 ? (
  linkedMemos.map(m => (
    <button key={m.id} type="button" className="todo-item__memo-link" onClick={() => onOpenMemo(m.id)}>
      📎 {m.title || '제목 없음'}
    </button>
  ))
) : (
  <button type="button" className="todo-item__memo-link todo-item__memo-link--empty" onClick={handleEditStart} aria-label="메모 연결">
    📎 메모 연결
  </button>
)}
```
`Props` 인터페이스(L19)의 `onUpdate` Pick 타입에서 `'memoId'` → `'memoIds'`.

### 6.3 QuickMemo 연결/해제 (`QuickMemo.tsx`)
Props(L15) 교체 — 범용 `onUpdateTodo` 대신 명시적 콜백 2개:
```ts
onLinkMemo: (todoId: string, memoId: string) => void;
onUnlinkMemo: (todoId: string, memoId: string) => void;
```
`handleLinkTodo`(L61-65):
```ts
function handleLinkTodo() {
  if (!selectedTodoId || !activeId) return;
  onLinkMemo(selectedTodoId, activeId);
  setSelectedTodoId('');
}
```
필터(L145-146):
```ts
const linkedTodos = todos.filter(t => activeId != null && (t.memoIds ?? []).includes(activeId));
const linkableTodos = todos.filter(t => activeId == null || !(t.memoIds ?? []).includes(activeId));
```
언링크 버튼(L239) `onClick`만 교체: `onClick={() => activeId && onUnlinkMemo(t.id, activeId)}`. 나머지 JSX 구조(L229-268)는 변경 없음 — 이미 0..n 항목을 렌더하는 구조라 그대로 재사용된다.

### 6.4 배선 (`TodoList.tsx`, `App.tsx`)
- `TodoList.tsx`(L16): `onUpdate` Pick 타입만 `'memoIds'`로 교체.
- `App.tsx`: `useTodos()` 구조분해에 `linkMemoToTodo`, `unlinkMemoFromTodo` 추가. `<QuickMemo>`(L315-324)에서 `onUpdateTodo={updateTodo}`(L323)를 지우고 `onLinkMemo={linkMemoToTodo}` / `onUnlinkMemo={unlinkMemoFromTodo}`로 교체. `pruneMemoLinks` effect(L69-71)와 `TodoList`에 넘기는 `onUpdate={updateTodo}`는 그대로 둔다(수정 모드 배치 저장은 여전히 `updateTodo` 경유).

### 6.5 SCSS
`.claude/rules/scss.md` 규칙 준수: BEM 중첩 3단계 이내, 색상은 `var(--*)`, 폰트는 `@include font()`만, `!important` 금지, 속성 순서(Box Model → Layout → Design → Typo&Pos) 엄수.

`src/styles/components/_todo.scss`의 `&__memo-link`(L932) 블록 근처에 추가:
```scss
&__memo-checklist {
  max-height: rem(140);
  padding: rem(6);
  display: flex;
  flex-direction: column;
  gap: rem(6);
  overflow-y: auto;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

&__memo-empty {
  @include font(12);
  color: $gray9;
}
```
`.todo-item__memo-link`/`--empty`(L932-950 근처)와 `.todo-item__meta`(L681, `flex-wrap`)는 변경 없이 그대로 여러 배지를 감당한다.

`src/styles/components/_quick-memo.scss`의 `&__linked*`(L278-370대) 블록들은 변경 불필요 — 이미 0..n 항목을 스택하는 구조.

## 7. 접근성
- 체크박스 목록: 기존 `form-chk`/`form-chk__text` 관례를 그대로 따르므로 별도 ARIA 속성 불필요(네이티브 체크박스+라벨).
- 카드의 메모 배지 여러 개: 각 배지가 독립된 `<button>`이므로 탭 순서로 자연스럽게 순회 가능. 빈 상태 버튼은 기존 `aria-label="메모 연결"` 유지.
- QuickMemo 언링크 버튼의 `aria-label="연결 해제"`는 기존 그대로 유지.

## 8. 엣지 케이스
- **메모가 여러 할 일에 연결된 채 삭제됨**: `pruneMemoLinks`가 각 할 일의 배열을 독립적으로 필터링, 빈 배열은 `undefined`로 접는다. 같은 할 일의 다른 메모 연결은 그대로 유지.
- **같은 메모를 두 번 연결 시도**: `linkMemoToTodo`의 `includes` 가드로 중복 방지 — 배지가 중복 렌더되지 않는다.
- **마지막 메모 연결 해제**: `unlinkMemoFromTodo`/`pruneMemoLinks` 둘 다 빈 배열을 `undefined`로 일관되게 접어서, 카드가 자동으로 빈 상태 버튼으로 되돌아간다.
- **기존 localStorage 데이터(구버전 `memoId: string`)**: `migrateTodo`가 `loadFromStorage`에서 `memoId: "x"` → `memoIds: ["x"]`로 변환하고 `memoId` 키를 제거. 이후 `useEffect(() => localStorage.setItem(...), [todos])`가 새 포맷으로 자동 재저장한다.
- **구버전 백업 JSON 가져오기**: `importData`에서도 동일한 `migrateTodo` 적용. 신규 포맷 백업(이미 `memoIds` 배열)에 대해서는 idempotent(그대로 통과).
- **`selectedTodoId`가 가리키는 할 일이 이미 다른 곳에서 삭제된 경우**: `linkMemoToTodo`의 `prev.map`이 해당 id를 못 찾아도 그냥 무시되고 아무 것도 바뀌지 않는다(에러 없이 안전).

## 9. 구현 체크리스트 (파일별)
1. `src/types/todo.ts` — `memoId?: string;` → `memoIds?: string[];`
2. `src/hooks/useTodos.ts` — `migrateTodo` 헬퍼 추가, `loadFromStorage`/`importData`에 적용, `updateTodo` Pick 타입 교체, `pruneMemoLinks` 배열 대응 재작성, `linkMemoToTodo`/`unlinkMemoFromTodo` 추가 후 `return`에 포함
3. `src/components/TodoItem.tsx` — Props 타입, `editMemoId`→`editMemoIds` state, `handleEditStart`/`handleSave`, `toggleEditMemo` 헬퍼, 수정 모드 체크박스 목록 마크업, `linkedMemo`→`linkedMemos` 조회, 카드 배지 0..n 렌더
4. `src/components/QuickMemo.tsx` — Props(`onLinkMemo`/`onUnlinkMemo`), `handleLinkTodo`, `linkedTodos`/`linkableTodos` 필터, 언링크 버튼 콜백
5. `src/components/TodoList.tsx` — `onUpdate` Pick 타입만 교체
6. `src/App.tsx` — `linkMemoToTodo`/`unlinkMemoFromTodo` 구조분해, `<QuickMemo>` props 교체
7. `src/styles/components/_todo.scss` — `&__memo-checklist`, `&__memo-empty` 추가
8. `src/styles/components/_quick-memo.scss` — 변경 없음(확인만)
9. `BACKLOG.md` — 5번 항목("할 일당 메모 여러 개 연결")을 "완료된 항목" 목록으로 이동
10. README.md/CHANGELOG.md는 `.claude/settings.json`의 git commit 전처리 훅이 커밋 시점에 자동 갱신하므로 수동 작업 불필요

## 10. 검증 방법
이 프로젝트엔 자동화 테스트가 없어서 `npm run build` + `npm run lint` + 수동 클릭 테스트로 검증한다(기존 관례와 동일).

1. `npm run build` — 타입 에러 없는지 확인(필드명이 바뀌므로 놓친 `memoId` 참조가 있으면 여기서 잡힘).
2. `npm run lint`.
3. `npm run dev` 후 수동 확인:
   - 할 일 하나 수정 모드 진입 → 체크박스로 메모 2개 이상 선택 → 저장 → 카드에 📎 배지가 개수만큼 뜨는지 확인.
   - 배지 클릭 시 해당 메모가 열리는지 확인.
   - QuickMemo 열어서 다른 할 일에 같은 메모 연결 → "연결된 할 일" 목록에 반영 확인, 한 할 일에 메모 여러 개가 실제로 동시에 붙는지 확인(기존 연결을 덮어쓰지 않는지).
   - QuickMemo의 × 버튼과 수정 모드 체크 해제 양쪽에서 각각 해제 → 마지막 하나 해제 시 📎 배지가 사라지고 "메모 연결" 빈 상태 버튼으로 돌아오는지 확인.
   - 메모 하나를 삭제 → 그 메모가 연결돼 있던 여러 할 일에서 해당 배지만 사라지고 다른 연결은 유지되는지 확인.
   - 이미 연결된 메모를 다시 연결 시도 → 중복 배지 안 생기는지 확인.
4. **마이그레이션 경로(중요)**: 개발자도구 콘솔에서 `localStorage['todolist-items']`를 구버전 포맷(`memoId: "<실제 존재하는 메모 id>"`을 가진 항목 포함)으로 덮어쓰고 새로고침 → 해당 할 일이 올바른 배지로 표시되는지, 수정 모드 체크박스가 미리 체크돼 있는지, localStorage를 다시 확인했을 때 `memoIds` 배열로 바뀌고 `memoId` 키가 사라졌는지 확인.
5. **백업 가져오기 경로**: 현재 데이터 내보내기 → JSON을 손으로 구버전 `memoId` 포맷으로 수정 → 앱에서 다시 가져오기 → 정상적으로 배지가 뜨는지 확인.
6. `.claude/rules/html.md`, `.claude/rules/scss.md` 규칙(BEM, `<button type="button">`, `screen-out`, 색상/폰트 변수·믹스인 사용) 준수 여부 육안 검토.
