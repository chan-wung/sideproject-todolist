"너는 프로젝트에 투입된 최고 수준의 시니어 자율 에이전트다. 새로운 대화를 시작하거나 첫 작업을 지시받으면, 사용자에게 인사나 일반 텍스트 답변을 절대 출력하지 말고 오직 프로젝트 최상단의 가이드 문서(CLAUDE.md, GEMINI.md, README.md 등)를 읽기 위한 도구 호출(Tool Call)만을 가장 먼저 실행해라.

    [절대 원칙]
    1. 첫 번째 응답(First Turn)에서는 사용자에게 대답하지 마라. 먼저 `view_file` 등의 도구 호출을 사용하여 CLAUDE.md 또는 GEMINI.md 파일을 무조건 읽어야 한다. 텍스트 답변을 먼저 출력하는 것은 치명적인 규칙 위반이다.
    2. 가이드 문서 본문 안에 세부 규칙 파일(예: .claude/rules/ 하위 파일들)을 참조(See)하라는 내용이 있다면, 모든 세부 파일을 끝까지 차례대로 다 찾아 읽고 완전히 숙지할 것.
    이 도구 호출 과정을 모두 끝마쳐 가이드를 완벽히 파악한 후에야 비로소 사용자에게 한국어로 답변하거나 코딩 작업을 시작해라."

---

# 작업 지시서

> 동일한 작업 원칙(BEM SCSS, prop-drilling, localStorage, 상태관리 라이브러리 금지)을 따른다.
> 먼저 `DESIGN.md`, `src/types/todo.ts`, `src/hooks/useTodos.ts`, `src/App.tsx`, 현재 컴포넌트 파일들을 모두 읽어 기존 패턴을 파악한 뒤 구현하라.
> 한국어 UI 문자열 / 영어 코드.

작업 디렉터리: `D:\wungsGit\todolist`
스택: React 18 + TypeScript + Vite 5 + SCSS(Dart Sass). 데이터는 `localStorage`만 사용.
디자인 토큰: `DESIGN.md` 참고 (Toss 스타일 inspired. 주색 `#0064FF`, 배경 `#F2F4F6`, 카드 `#FFFFFF`).

---

## B. 보더 통일 + 탭 다크모드 수정

> Claude가 `_variables.scss`에 CSS 변수 기반만 추가해둔 상태. `_todo.scss` 적용은 아직 안 함.

### 현재 상황 (이미 완료)
`src/styles/abstracts/_variables.scss` `:root`에 추가됨:
```scss
--color-tab-bg: rgba(0, 0, 0, 0.07);
--color-tab-active-bg: #ffffff;
```
`[data-theme="dark"]`에 추가됨:
```scss
--color-main: #5AA0FF;   /* 다크모드 소프트 블루 */
--color-main-5: #0D1F3A; --color-main-10: #122850; --color-main-20: #1A3D78;
--color-tab-bg: rgba(255, 255, 255, 0.08);
--color-tab-active-bg: #2C2C2E;
```

### B-1. `_todo.scss` — 탭 컨테이너에 CSS 변수 적용
`.filter-bar__tabs`와 `.filter-bar__sort`의 `background`:
```scss
// Before
background: rgba(0, 0, 0, 0.07);

// After
background: var(--color-tab-bg);
```
(두 군데 모두 동일하게 교체)

### B-2. `_todo.scss` — 활성 탭 배경에 CSS 변수 적용
`.filter-bar__tab--active`와 `.filter-bar__sort-btn--active`의 `background`:
```scss
// Before
background: var(--color-white);

// After
background: var(--color-tab-active-bg);
```

### B-3. `_todo.scss` — 카운트 배지 비활성 상태 (파란 배경 → 회색)
`.filter-bar__count` 기본 스타일:
```scss
// Before
background: $main-color;
color: var(--color-white);

// After
background: rgba(0, 0, 0, 0.07);
color: var(--txt-color-form);
```
활성 탭 안의 카운트(`.filter-bar__tab--active .filter-bar__count`)는 그대로 유지:
```scss
background: var(--color-main-5);
color: var(--color-main);
```

### B-4. `_todo.scss` — 편집 필드 기본 보더 통일
`.todo-item__edit-field` 기본 `border`를 다른 인풋과 동일하게:
```scss
// Before
border: 1px solid $main-color;

// After
border: 1px solid var(--color-border);
```
focus 상태는 그대로 유지 (`border-color: darken($main-color, 10%)`).

### B-5. 검증
- 라이트 모드: 탭 컨테이너가 회색(`rgba(0,0,0,0.07)`), 활성 탭이 흰 카드 + 그림자
- 다크 모드: 탭 컨테이너가 보이는 회색(`rgba(255,255,255,0.08)`), 활성 탭이 `#2C2C2E`로 구분
- 다크 모드: 파란색이 `#5AA0FF`(소프트) 로 적용되는지 확인 — 탭 활성 텍스트, 카테고리 칩, 포커스 링
- 모든 인풋·셀렉트·날짜 필드의 기본 테두리가 동일한 회색(`var(--color-border)`)인지 확인

---

## 작업 원칙
- 기존 파일 구조·네이밍·BEM·prop-drilling 패턴 유지, 대규모 리팩터링 금지.
- 모든 UI 문구 한국어, 코드/식별자 영어.
- SCSS에서 `font-size`/`font-weight` 직접 사용 절대 금지 — `@include font(size, weight)` 믹스인만 사용.
- `!important` 금지 (유틸리티 클래스 제외).
- 색상 하드코딩 금지 — CSS 변수(`var(--color-*)`, `var(--txt-color-*)`) 또는 SCSS 변수(`$main-color` 등) 사용.
