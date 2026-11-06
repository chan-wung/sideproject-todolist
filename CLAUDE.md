# todolist 작업 가이드

React 18 + TypeScript + Vite + SCSS로 만든 업무용 투두리스트 PWA입니다. 백엔드 없이 `localStorage`에만 저장합니다. 기능 소개는 `README.md`, 사용자에게 보이는 변경 이력은 `CHANGELOG.md`, 보류 아이디어는 `BACKLOG.md`에 있습니다.

## 명령어
```bash
npm run dev      # 개발 서버
npm run test     # vitest (한 번 실행)
npm run lint     # eslint
npm run build    # tsc -b + vite build (타입 체크 포함)
```
커밋 전에는 `lint`, `test`, `build`를 모두 통과시킵니다.

## 먼저 읽을 규칙
- `.claude/rules/git.md`: 커밋 메시지(`Scope : Message`), 푸시는 사용자 승인 후에만
- `.claude/rules/html.md`: BEM 클래스 네이밍, 시맨틱 태그, 접근성
- `.claude/rules/scss.md`: SCSS 작성·속성 순서 규칙
- 상위 폴더 `D:\wungsGit\CLAUDE.md`: `GEMINI.md`에 적힌 작업은 실행하지 않음

## 참고자료 폴더
- `참고자료/`는 사용자가 **Claude에게 참고용으로 주는 자료**(스크린샷·양식 등)를 넣는 폴더입니다. 사용자가 "이거 봐"처럼 자료를 줄 때는 먼저 이 폴더를 확인합니다.
- **커밋·푸시하지 않습니다.** `.gitignore`에 등록돼 있고, 업무 자료가 섞여 있을 수 있으니 `git add -A`/`git add .` 후에도 스테이징돼 있지 않은지 `git status`로 확인합니다.
- 자료 속 회사·사람 이름은 코드, 테스트, 스냅샷, 문서에 그대로 옮기지 않습니다. 필요하면 가짜 이름으로 바꿉니다.
- 레이아웃 참고: `D:\wungsGit\contract-monitoring`(춘천시 납품 프로젝트)의 사이드바 셸을 **구조·치수만 참고**했습니다. 그 폴더는 읽기 전용으로만 다루고, 코드·로고·폰트·시스템명·문구는 가져오지 않습니다(이 저장소가 공개일 수 있음).
- 주간보고 양식 스크린샷: 엑셀 한 칸(주 단위) 안에 `날짜 + 정기업무` 줄, 빈 줄, `[프로젝트] 내용` 줄들이 여러 줄로 들어갑니다. 주간보고 기능의 출력 형식 기준입니다.

## 코드 구조 (2026-11 리팩터링 이후)
- `src/App.tsx`: 셸 조립(툴바·사이드바·본문), 화면 선택, 백업 가져오기/내보내기, 토스트. **상태(`useTodos`·`useMemos`)는 여기서 들고** 화면에는 props로 내려 줌
- `src/pages/`: 화면 단위. `DashboardPage`(대시보드), `TodoPage`(할 일, 조립만), `CalendarPage`(캘린더), `MemoPage`(메모장), `WeeklyReportPage`(주간보고). 화면 이름·메뉴는 `constants/labels.ts`의 `VIEW_*`, 주소 경로(`/todos`·`/report`, 해시 `#` 없음)로 구분
- `src/components/`
  - `AppNav.tsx`: 화면 전환 메뉴. 폭 1024px 이상은 왼쪽 카드형 사이드바, 미만(태블릿·모바일)은 화면 아래에 고정되는 탭 바(아이콘+이름). 같은 마크업을 CSS로 두 모양으로 바꿈. 사이드바 맨 아래에는 `ProfileMenu`(`placement="nav"`)가 붙는다. 사이드바 접기·펴기 버튼은 메뉴가 아니라서 카드 오른쪽 위 모서리에 걸친 작은 원형 화살표로 둔다(메뉴 목록 안에 넣지 않는다)
  - `ViewLink.tsx`: 다른 화면으로 가는 링크. 진짜 `<a href="/report">`이고 그냥 누를 때만 `navigate()`로 화면을 바꾼다(Ctrl·휠 클릭은 새 탭). **화면 간 링크는 `<a href>`를 직접 쓰지 말고 이걸 쓴다**
  - `PeriodNav.tsx`: 기간(주·달) 이동 막대. 주간보고·캘린더 공용
  - `CalendarMonthView.tsx`·`CalendarTimeGrid.tsx`·`CalendarDayDetail.tsx`: 캘린더의 월 격자 / 주·일 보기(머리글+종일 줄+시간 눈금) / 고른 날 목록. `CalendarPage`는 보기 전환·기준 날짜·범위 계산만 하고 이 셋을 조립한다
  - `PageHead.tsx`: 화면 맨 위 제목 줄. 다섯 화면 공용
  - `AppToolbar.tsx`: 상단 툴바(올해 남은 날 D-day + 다크모드 버튼 + 좁은 화면용 프로필 버튼). 1024px 이상에서는 화면 위에 고정(높이 64px). 1024px 미만에서는 다크모드 버튼이 아이콘만 보이는 한 줄(글자는 `app-toolbar__txt`로 감싸 스크린리더용으로 남기고 `title`로 도움말)
  - `ProfileMenu.tsx`: 프로필 버튼 + 드롭다운(이름 입력, 내보내기·가져오기·반복 일정·완료 이력·설정). 1024px 이상은 사이드바 맨 아래(`nav`, 위로 열림·접으면 첫 글자 원형+오른쪽으로 열림), 미만은 툴바 오른쪽 끝(`toolbar`, 둥근 버튼+아래로 열리는 팝업). 두 군데가 같은 값·동작(`ProfileMenuShared`)을 `App`에서 받는다. 메뉴 상자는 닫혀도 DOM에 남긴다(가져오기 파일 입력이 사라지면 안 됨). 다크모드는 여기 없고 툴바에 있다
  - `TodoItem.tsx`: 할 일 카드(조립만 담당). 편집 폼 `TodoItemEditForm`, 하위 항목 `TodoItemSubtasks`, 더보기 메뉴 `TodoItemMenu`로 분리됨
  - `TodoInput.tsx`: 할 일 입력창. 종류를 `연차·휴가`로 고르면 글 입력칸 대신 `LeaveFields`(시각·휴가 이름·사유 칸)가 나오고, 옵션 줄에서는 `우선순위`·`프로젝트`·`반복 주기`가 숨고 `연차 종류` 셀렉트가 들어오며 상세 옵션이 자동으로 펼쳐진다(등록은 우선순위 `medium`·프로젝트 빈 값으로 고정). 카드 수정 폼(`TodoItemEditForm`)도 연차이면 같은 칸을 숨긴다. 스크롤로 화면 위에 붙을 때 뒤가 비치지 않도록 `::before`와 배경색 그림자를 깔아 둔다
  - `TodoDateField.tsx`: 등록·편집 폼이 같이 쓰는 날짜 칸(연차는 날짜 하나 `DatePicker`, 그 밖은 시작일~마감일 `DateRangePicker`)
  - `LeaveFields.tsx`: 연차 입력칸 묶음(연차 종류 셀렉트는 빼고 시각·이름·사유·안내만. 화면만 그리고 값·등록은 `TodoInput`이 가짐)
  - `DatePickerParts.tsx`: `DatePicker`·`DateRangePicker`가 같이 쓰는 입력 칸·월 이동 헤더·요일/날짜 격자(`block` 접두사로 클래스 이름은 각 선택기 그대로). 두 선택기의 공통 스타일은 `abstracts/_date-picker-base.scss`의 `date-picker-base` 믹스인
  - `ScrollTopButton.tsx`: 스크롤이 내려가 있을 때만 나오는 `맨 위로` 버튼(스크롤 감지 포함)
  - `icons.tsx`: 인라인 SVG 아이콘 컴포넌트(툴바·메뉴 아이콘 포함, 이모지 대신 쓴다). 일부는 `size`·`className`·`decorative`를 받는다(`size="1em"`이면 글자 크기를 따름). **글자 옆에 붙일 때는 `className="ico-text"`**: 전역 reset이 `svg`를 `display: block`으로 두기 때문에 이 클래스 없이는 줄이 바뀐다
  - `*Modal.tsx`: 모달 계열. 모두 `<dialog>` + `useModalDialog`
- `src/hooks/`
  - `useTodos`: 할 일 상태와 필터·정렬·실행취소·완료 이력. 시리즈와 할 일을 **함께** 바꾸는 작업(승격·삭제·초기화·시작 시 마이그레이션)도 여기 있음
  - `useRecurrenceSeries`: 반복 시리즈 상태·저장·회차 생성·CRUD. `useTodos`가 내부에서 호출함
  - `useView`: 주소 경로 ↔ 현재 화면(`useSyncExternalStore`, `popstate`+자체 이벤트). `navigate(view)`로 이동, `migrateLegacyHash()`가 옛 `/#/report` 북마크를 `/report`로 바꿈(`main.tsx`에서 호출). 모르는 경로는 기본 화면(할 일)
  - `useCalendarMonth`: 달력에 보이는 달·월 이동·앞 빈칸·일수 (`DatePicker`·`DateRangePicker`·`CalendarPage`가 같이 씀)
  - `useSelection`(선택 모드), `useModalDialog`(열기/닫기·스크롤 잠금 + 바깥 클릭 닫기 핸들러를 돌려줌), `useDismiss`, `useTheme`(라이트/다크 저장 + `body[data-theme]`), `useDayChange`, `usePersistentState`, `useMemos`, `useWeeklyReports`(주별 보고서 저장본·복사 완료 기록)
  - `useToast`(토스트 상태), `useShareActions`(복사·공유·카카오 공유 실행 + 결과 토스트)
- `src/constants/labels.ts`: 우선순위·반복 주기·업무 종류·화면 이름의 라벨과 옵션 목록
- `src/utils/`: `date`(주 계산·기간 저장 모양 `normalizeRange` 포함), `recurrence`, `kind`(`normalizeKind`), `weeklyReport`(주간보고 글 생성), `calendar`(캘린더 기간 항목 `buildCalendarItems`·띠 배치 `layoutWeek`/`layoutMonth`·주·일 보기 `sundayWeekDates`/`layoutTimed`), `calendarClass`(띠·배지 클래스 `itemClass`, 주말 색 `weekendMod`), `dashboard`(대시보드 숫자), `backup`(백업 파일 내려받기·`readBackupFile`로 읽기·알림 판단), `backupData`(백업 파일 읽기·검증 `parseBackup`), `leave`(연차 제목 만들기·등록 가능 여부 `leaveStatus`·제목에서 시각 읽기 `leaveTimeRange`), `share`(복사·공유와 토스트 문구), `list`(`moveItem`), `storage`(`readStorage`·`writeStorage`), `todoData`(할 일·완료 이력 검증과 옛 형식 마이그레이션 `validateTodos`·`validateCompletionLog`, `toCompletionLogEntry`), `todoFilter`(`filterTodos`·`sortTodos`), `classNames`(`cx`), `text`(`truncate`)
- **화면 모양**: 각 화면의 맨 위 제목은 그 화면 자신이 공용 `PageHead`(`h1`)로 그린다(앱 공통 헤더는 없음). 제목은 카드 밖(회색 배경 위)에 두고 카드 안에는 넣지 않는다. 본문(`.todo-app`)은 최대 폭 없이 사이드바 옆 공간을 꽉 채운다(`$site_max_width`는 좁은 화면의 메뉴 상자에만 남아 있음). 할 일 화면의 `QuickNav`는 목록 위 가로 칩 줄
- **좁은 화면(1024px 미만)**: 메뉴는 아래 탭 바(`$tabbar_height` 56px, `position: fixed`)라서 본문 아래에 같은 높이의 여백(`.app-shell`의 `padding-bottom`)을 두고, `맨 위로` 버튼과 토스트는 그 위로 띄운다. 이 폭에 쓰는 스타일은 `@include below_shell`
- **글자 크기**: 글자는 전부 `@include font(N)` 믹스인을 거치고, PC(1024px 이상)에서는 믹스인이 `$font_scale_pc`(1.125)를 곱한다(본문 16px → 18px). 비율을 바꾸려면 `_variables.scss`의 이 값만 고친다. `font-size`를 직접 쓰지 않는다(배율이 빠짐). 간격·상자 크기(`rem()`)는 배율을 받지 않는다
- **본문 높이**: `#root`(세로 flex, `min-height:100vh`) → `.app-shell` → `.app-shell__content` → `.todo-app` → `.todo-app__view`가 모두 `flex: 1 0 auto`로 남는 높이를 이어받는다. 푸터는 항상 맨 아래이고, 카드형 화면(`.calendar`·`.weekly-report`·`.memo-page`)은 같은 방식으로 카드가 남는 높이를 채운다. 헤더 높이는 `.app-shell`의 `padding-top`(**margin 금지**: body 밖으로 겹쳐 올라가 항상 64px 더 스크롤됨)으로만 둔다. `min-height: 100vh`를 안쪽 요소에 다시 걸지 않는다
- `src/styles/`: `main.scss`가 `abstracts → base → components` 순서로 `@import`. 컴포넌트마다 `components/_이름.scss` 한 파일. 레이아웃 폭 기준은 `$break_shell`(1024px)과 `@include shell`

## 데이터 모델 메모
- 업무 종류 `kind`: `task`(일반, `[프로젝트] 내용`) / `routine`(정기, `날짜 + 내용 완료`) / `leave`(연차·휴가, `날짜 + 내용`). 없거나 잘못된 값은 `task`. `Todo`·`RecurrenceSeries`·`CompletionLogEntry`에 모두 있고, 반복 회차와 완료 이력이 이어받음
- **프로젝트(화면 이름) = 코드의 `category`**: 화면 글자는 `프로젝트`(`춘천시청` 같은 이름이 들어가는 칸이라 업무 종류와 헷갈리지 않게 바꿈)지만 저장 필드·타입·함수 이름은 `category` 그대로다(저장 데이터·백업 호환). 화면에 보이는 새 글자는 `프로젝트`로 쓴다
- 연차·휴가의 이름·시각·사유는 `utils/leave.ts`가 **제목 한 줄**(`연차 14:00~15:00 (병원 진료)`)로 합쳐 저장한다(별도 필드 없음). 그래서 목록·완료 이력·백업·주간보고가 그대로 같이 쓴다. 등록은 할 일 입력창(`TodoInput`)에서 종류를 `연차·휴가`로 고르면 나오는 `LeaveFields`로 한다(캘린더는 보기 전용이라 연차를 등록·삭제하지 않는다)
- 기간: `Todo.startDate`(선택)가 있으면 시작일~`dueDate` 기간 업무, 없으면 마감일 하루짜리. `startDate < dueDate`일 때만 저장한다(`validateTodos`가 아니면 버림, `updateTodo`는 날짜 키가 있을 때만 바꿈). 완료 이력에도 `startDate`를 남긴다. 반복 일정은 마감일 기준이라 시작일을 쓰지 않는다
- 캘린더는 **모든 항목**을 보여 준다: 할 일(완료 포함)은 `startDate ?? dueDate ?? 등록일` 기간에, 완료 정리된 이력(기간이 없는 옛 이력은 완료한 날)과 반복 예정 회차도 같이. 띠는 날짜 칸 층(`calendar__cells`) 위에 얹는 별도 층(`calendar__bars`, `pointer-events: none`)이고 한 주에 3줄까지, 넘치면 날짜 칸에 `+N`. `완료한 항목 숨기기` 체크박스(`todolist-pref-calendar-hide-done`)로 완료분을 뺄 수 있다
- 캘린더 보기는 `월/주/일`(`CALENDAR_VIEW_*`, 고른 값은 `todolist-pref-calendar-view`)이고 주는 **일요일 시작**이다. 보고 있는 날짜 `anchor` 하나로 세 보기를 모두 정한다. 주·일 보기의 시간 칸에는 **하루짜리 시간 연차**(제목이 `연차 HH:MM~HH:MM`)만 놓이고 나머지는 모두 `종일` 줄(할 일에는 시각 필드가 없다). 시간 칸 높이는 1시간 `rem(48)` 고정이라 블록 위치는 하루의 분(0~1440)을 %로 계산한다. 일요일은 `--color-sunday`(빨강), 토요일은 `--color-saturday`(파랑) 변수를 쓴다
- 연차·휴가는 날짜(`dueDate`) 필수·반복 불가·시작일 없음·메모 연결 없음(`addTodo`/`updateTodo`가 경계에서 지킨다: 종류를 연차로 바꾸면 시작일·메모 연결을 지우고 반복 승격을 막는다. 이미 지난 날짜로 등록·수정하면 바로 완료 처리). 날짜가 지나면 `useTodos`가 앱 시작·날짜 변경·탭 복귀 때 `completePastLeaves`(`utils/leave.ts`)로 **자동 완료**한다(완료 시각은 그날 23:59:59). 카드(`TodoItem`)는 우선순위·프로젝트·메모 연결 대신 `leaveTypeOf(제목)`으로 읽은 연차 종류를 보여 준다(종류는 따로 저장하지 않고 제목에서 읽음). 완료 이력에도 `dueDate`를 남겨 정리된 연차가 주간보고에서 날짜를 잃지 않게 함
- 백업 가져오기: `handleImportFile`이 `parseBackup`으로 검증만 하고 `pendingImport`에 담아 `ConfirmModal`(구역별 건수, `현재 데이터 내보내기` 보조 버튼)을 띄운다. 확인하면 `flushSync`로 적용해 저장 실패 여부(`getStorageStatus`)를 바로 확인한다. `version`이 `BACKUP_VERSION`보다 크면 거부. `전체 초기화`는 할 일·메모·완료 이력·반복 일정·주간보고를 비우고 설정(테마·이름)은 유지한다
- 메모 연결: `App`의 effect가 메모 id 목록/할 일/반복 시리즈가 바뀔 때 `pruneMemoLinks`로 없어진 메모의 연결을 할 일과 시리즈에서 함께 지운다. 옛 단일 메모(`todolist-memo-content`) 이행은 `useMemos`가 새 키가 없을 때 한 번만 한다
- `이번주 마감` 필터(`isThisWeek`)는 월~일 기준(이번 주에 이미 지난 날 포함)이다
- 주간보고는 하위 항목도 제목 아래에 `- 내용`으로 넣는다(연차는 제외, `하위 항목 포함` 체크박스 `todolist-pref-report-subtasks`로 끔). 같은 제목은 한 덩어리로 합치고 하위 항목은 겹치지 않게 모은다
- 주간보고의 자동 생성 글은 **완료 상태로 남은 할 일 + 완료 이력**에서 그때그때 계산함(`buildWeeklyReport`). 사용자가 직접 고친 글은 주 시작일별로 따로 저장하며, `초기화`를 누르면 저장본을 지움. `텍스트 복사`한 주는 완료로 기록해 지난주 미보고 알림에 씀

## 중복을 다시 만들지 않기
같은 일을 하는 코드를 새로 쓰기 전에 아래를 먼저 씁니다.

| 하려는 일 | 쓸 것 |
|---|---|
| 모달 열기/닫기 + 스크롤 잠금 + 바깥 클릭 닫기 | `useModalDialog(ref, isOpen, onClose)`가 돌려주는 핸들러를 `<dialog onClick>`에 |
| 메뉴·팝오버 바깥 클릭/Esc 닫기 | `useDismiss(ref, open, onClose, { escape })` |
| 자정·탭 복귀 때 갱신 | `useDayChange(callback)` |
| 우선순위·반복 주기 라벨, `<option>` 목록 | `constants/labels.ts` |
| 복사·공유 결과 토스트 문구 | `share.ts`의 `copyFeedback`/`shareFeedback`/`kakaoFeedback` |
| 배열 항목 순서 이동 | `moveItem` |
| localStorage 쓰기 / 검증해서 읽기 | `writeStorage` / `readStorage(key, parse, fallback)` |
| 할 일·완료 이력 검증·마이그레이션 | `utils/todoData.ts`(`validateTodos` 등). `hooks`에서 가져오지 않는다 |
| 할 일 목록 필터·정렬 | `utils/todoFilter.ts`의 `filterTodos`/`sortTodos` |
| 토스트 띄우기, 복사·공유 실행 | `useToast`, `useShareActions(showToast)` |
| 조건부 클래스 이름 잇기 | `utils/classNames.ts`의 `cx(...)` (`[...].filter(Boolean).join(' ')`를 쓰지 않는다) |
| 글이 길면 줄여서(`…`) 보이기 | `utils/text.ts`의 `truncate(text, max)` |
| 날짜 선택기의 입력 칸·헤더·격자 / 공통 스타일 | `DatePickerParts` / `@include date-picker-base` |
| 글자 바로 옆 작은 아이콘 | `icons.tsx` 아이콘 + `className="ico-text"` |
| `'all'` 없는 프로젝트(`category`) 목록 | `useTodos`의 `categoryOptions` |
| 업무 종류 이름·`<option>` 목록, 값 정규화 | `KIND_LABEL`/`KIND_OPTIONS`, `normalizeKind` |
| 화면 이름·메뉴 목록 | `labels.ts`의 `VIEW_LABEL`/`VIEW_OPTIONS`, 현재 화면은 `useView` |
| 다른 화면으로 가는 링크·이동 | `ViewLink`(링크), `navigate(view)`(코드에서 이동). `location.hash`·`<a href="#/…">`를 쓰지 않는다 |
| 시작일~마감일 입력·저장 모양 | `TodoDateField`(입력 칸), `date.ts`의 `normalizeRange`(하나만 고르거나 같은 날이면 마감일만 저장) |
| 주 시작(월요일)·로컬 날짜·`2026.11.2` 표기 | `date.ts`의 `startOfWeek`/`toLocalDateStr`/`formatReportDate` |
| 달력 칸(월 이동·빈칸·일수), 칸의 날짜 문자열 | `useCalendarMonth`, `date.ts`의 `dateStr` |
| 주·달 이동 막대 | `PeriodNav` |
| 화면 맨 위 제목 줄 | `PageHead` (제목 + 옆에 붙는 보조 정보) |
| 백업 파일 읽기·검증(가져오기) | `utils/backupData.ts`의 `parseBackup` (검증 실패면 아무것도 적용하지 않음) |
| 백업 파일 내려받기, 백업 알림 판단 | `utils/backup.ts`의 `downloadBackup`/`backupReminder`, 상태는 `useBackupReminder` |
| 연차 제목(이름·시각·사유) 만들기, 같은 연차인지·등록 가능한지 판별 | `utils/leave.ts`의 `composeLeaveText`/`isSameLeave`/`leaveStatus` |
| 캘린더 항목·띠 배치 | `utils/calendar.ts`의 `buildCalendarItems`/`itemsOnDate`/`layoutMonth` |
| 한 주(7칸)의 띠 배치 / 일요일 시작 주의 날짜들 / 시간 칸 배치 | `layoutWeek` / `sundayWeekDates` / `layoutTimed` (`utils/calendar.ts`) |
| 일요일 빨강·토요일 파랑 | `weekendMod(block, 요일)` + `--color-sunday`/`--color-saturday` (색을 직접 쓰지 않는다) |
| 툴바·메뉴 아이콘 | `icons.tsx`(이모지를 쓰지 않는다) |
| `transition` 여러 속성 | `@include transition(color background-color)` (공백으로 이은 한 인자, 쉼표 나열 금지) |
| 특정 폭(1024px) 이상에서만 적용하는 스타일 | `@include shell` (폭 값을 직접 쓰지 않음) |
| 1024px 미만(태블릿·모바일)에서만 적용하는 스타일 | `@include below_shell` |
| 768px 이하에서만 적용하는 스타일 | `@include below_tab` (`@media (max-width: $break_tab)`를 직접 쓰지 않음) |
| 글자 크기 | `@include font(N)` (PC 배율 `$font_scale_pc`가 자동 적용됨) |
| 화면에서만 숨기고 스크린리더에는 남기기 | `.screen-out` 클래스, SCSS에서는 `@include visually-hidden` |

## 테스트와 안전장치
- **`TodoItem.test.tsx`는 스냅샷 기반 동작 고정 테스트**입니다(`__snapshots__/`). 마크업을 일부러 바꾼 경우에만 diff를 검토한 뒤 `npx vitest run -u`로 갱신합니다. 의도하지 않았는데 깨졌다면 리팩터링 실수이니 코드를 고칩니다.
- SCSS 파일을 나누거나 옮길 때는 전후 CSS를 비교합니다: `npx sass --quiet --no-source-map src/styles/main.scss > 파일.css` 후 `cmp`. 같아야 합니다. 믹스인으로 묶어 규칙 **순서만** 바뀌는 경우에는 `cmp` 대신 규칙 집합(선택자·`@media`·선언)이 같은지 비교합니다. `main.scss`의 `@import` 순서가 곧 캐스케이드 순서입니다. (`scss.md`는 `@use`를 언급하지만 이 프로젝트는 아직 `@import`를 씁니다.)
- 날짜에 의존하는 테스트는 `vi.useFakeTimers()` + `vi.setSystemTime(...)`으로 날짜를 고정하고, 끝나면 `vi.useRealTimers()`로 되돌립니다. 테스트 데이터의 회사·업체 이름은 가짜 이름을 씁니다(`참고자료` 규칙).
- 저장 데이터와의 호환을 깨지 않습니다. 키: `todolist-items`, `todolist-recurrence-series`, `todolist-memos-array`, `todolist-completion-log` 등(백업 알림용 `todolist-last-backup`, `todolist-backup-snooze`는 백업 파일에 들어가지 않는 설정값). 불러올 때는 `validate*`·`migrateTodo`를 거칩니다.

## 환경 주의 (Windows)
- vitest `globals`가 꺼져 있어서 Testing Library의 `cleanup()`을 `afterEach`에서 직접 호출해야 합니다.
- jsdom에는 `dialog.showModal()/close()`가 없어서 테스트에서 모킹합니다(`useModalDialog.test.ts`, `TodoItem.test.tsx` 참고).
- `core.autocrlf=true`라서 `LF will be replaced by CRLF` 경고는 정상입니다. 파일을 줄 단위로 자를 때 Git Bash의 `sed`는 `\r`을 지우니 `head`/`tail`을 씁니다.
- PowerShell에서 `npm`·`git`의 stderr 출력은 `NativeCommandError`처럼 보여도 실패가 아닌 경우가 많습니다. 결과 줄과 종료 코드로 판단합니다.
- `bash.exe.stackdump`는 Git Bash가 비정상 종료될 때 프로젝트 루트에 생기는 덤프 파일입니다. `.gitignore`에 있어 커밋되지는 않지만, **푸시할 때 프로젝트 안에 있으면 삭제**합니다.
- Bash 도구의 heredoc으로 파이썬 스크립트를 넘길 때 역슬래시 두 개가 하나로 풀려 들어갑니다(`'\n'`을 쓰려면 `chr(92)`로 만들기). 길거나 따옴표가 많은 스크립트가 `unexpected EOF` 셸 오류를 내면 파일 쓰기 도구로 스크립트 파일을 만들어 실행합니다.
- 화면 확인용 데이터를 브라우저 `localStorage`에 넣을 때는 **먼저 기존 값을 백업**합니다. 해시만 바꿔 이동하면 앱이 메모리의 옛 상태를 다시 저장소에 써서 넣은 데이터를 덮어쓸 수 있으니, 데이터를 넣은 뒤에는 주소를 바꿔 새로 불러옵니다. 끝나면 넣은 값을 지웁니다.
- 개발 서버를 띄웠다면 **그 포트의 프로세스만** 종료합니다. `taskkill /IM chrome.exe`처럼 Chrome 전체를 끄지 않습니다.

## 알려진 상태
- **실기기 미확인**: 모바일 PWA와 카카오톡 공유는 직접 눌러 확인하지 못했습니다.
- **작성 중 내용 보존 범위**: 할 일 입력창(`App`의 `todoDraft`)은 화면을 옮겨도, 하위 항목 입력(`TodoItem`의 `subText`)은 카드 편집 모드를 오가도 남습니다. 새로고침, 필터·정렬로 카드가 목록에서 사라지는 경우는 보존 대상이 아니고, 데이터 초기화 때는 입력창 초안도 비웁니다. 한글 조합 중 Enter는 `utils/ime.ts`의 `isImeComposing`으로 거릅니다(실제 Windows 한글 IME·모바일 입력은 아직 직접 확인하지 못했습니다).
- **엑셀 붙여넣기**: 주간보고는 `텍스트 복사` 하나뿐이다. 따옴표로 감싸 한 칸에 넣는 `엑셀 칸에 복사` 방식은 실제로 써 보니 맞지 않아 빼고 `toExcelCell`도 지웠다. 엑셀 칸을 더블클릭한 편집 상태에서 붙여넣어 한 칸에 들어가는지는 아직 확인하지 못했다.
- **화면 확인 범위**: 다크모드와 좁은 화면(폭 390px·700px·820px·1042px 프레임)에서 할 일·캘린더·주간보고·대시보드·메모장과 아래 탭 바·툴바를 눈으로 확인했다. 실제 휴대폰·태블릿 기기, 주소창이 접히는 모바일 브라우저(탭 바 위치)는 확인하지 못했다.
- **배포 설정 필요**: 주소가 `/report`처럼 경로 방식이라 정적 호스팅에서는 모든 경로를 `index.html`로 돌려주는 설정이 필요하다(없으면 새로고침 시 404). 개발 서버·`vite preview`는 기본으로 된다. 어떤 호스팅에 올릴지는 아직 정해지지 않았다.
- **글자 배율**: PC(1024px 이상)만 1.125배로 키웠다. 상자 높이가 `rem()`으로 고정된 곳은 글자가 커져도 높이는 그대로라, 새 UI를 만들 때 PC 폭에서 글자가 넘치지 않는지 본다.
- **통합 테스트**: `src/App.test.tsx`가 백업 가져오기(확인·취소·버전 거부)·전체 초기화·메모 연결 정리를 앱 전체로 확인한다. `<dialog>`의 `showModal`/`close`를 모킹하고 `vi.useFakeTimers({ shouldAdvanceTime: true })`를 쓴다.
- **작은 동작 차이**: 반복 회차 카드에서 종류를 바꾸면 그 회차만 바뀌고 시리즈 종류는 그대로입니다. 이전 완료 이력의 연차는 `dueDate`가 없어 주간보고에 들어가지 않습니다.
- **남은 계획**: 처음 계획한 1~6단계는 모두 만들었습니다(대시보드, 캘린더, 백업 알림 포함). 남은 것은 아래 정리 항목들입니다.
- **시작 화면**: 메뉴 맨 위는 `대시보드`지만 처음 열리는 화면(`DEFAULT_VIEW`)은 `할 일`입니다. 바꾸려면 `labels.ts`의 `DEFAULT_VIEW`를 고칩니다.
- **보류한 작업**: `@import → @use` 전환, `_icons_new.scss`(약 2,700줄) 분리. 두 가지 모두 급하지 않음.

## 작업 흐름
1. 기능 작업을 마칩니다.
2. 커밋 전에 **직전 변경분만이 아니라 코드베이스 전체**에서 리팩터링할 곳이 있는지 점검합니다.
3. 리팩터링은 기능 커밋과 섞지 않고 별도 `refactor` 커밋으로 나눕니다. 큰 구조 변경은 **동작 고정 테스트를 먼저 커밋**한 뒤 진행합니다.
4. `git status`·`git diff`로 의도한 파일만 바뀌었는지 요약 보고하고, 푸시는 사용자 승인을 받은 뒤에 합니다. 푸시 직전에 프로젝트 루트에 `bash.exe.stackdump`가 있으면 지웁니다.
5. 사용자에게 보이는 변경만 `CHANGELOG.md`(`YY.MM.DD` 헤더)에 적습니다. 순수 리팩터링은 적지 않습니다.
