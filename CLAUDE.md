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
- `src/pages/`: 화면 단위. `DashboardPage`(대시보드), `TodoPage`(할 일, 조립만), `CalendarPage`(캘린더), `MemoPage`(메모장), `WeeklyReportPage`(주간보고). 화면 이름·메뉴는 `constants/labels.ts`의 `VIEW_*`, 주소 해시(`#/todos`·`#/report`)로 구분
- `src/components/`
  - `AppNav.tsx`: 화면 전환 메뉴. 폭 1024px 이상은 왼쪽 카드형 사이드바(접기·펴기), 미만은 상단 가로 메뉴. 같은 마크업을 CSS로 두 모양으로 바꿈
  - `PeriodNav.tsx`: 기간(주·달) 이동 막대. 주간보고·캘린더 공용
  - `AppToolbar.tsx`: 상단 툴바. 1024px 이상에서는 화면 위에 고정(높이 64px)
  - `TodoItem.tsx`: 할 일 카드(조립만 담당). 편집 폼 `TodoItemEditForm`, 하위 항목 `TodoItemSubtasks`, 더보기 메뉴 `TodoItemMenu`로 분리됨
  - `icons.tsx`: 인라인 SVG 아이콘 컴포넌트
  - `*Modal.tsx`: 모달 계열. 모두 `<dialog>` + `useModalDialog`
- `src/hooks/`
  - `useTodos`: 할 일 상태와 필터·정렬·실행취소·완료 이력. 시리즈와 할 일을 **함께** 바꾸는 작업(승격·삭제·초기화·시작 시 마이그레이션)도 여기 있음
  - `useRecurrenceSeries`: 반복 시리즈 상태·저장·회차 생성·CRUD. `useTodos`가 내부에서 호출함
  - `useView`: 주소 해시 ↔ 현재 화면(`useSyncExternalStore`)
  - `useCalendarMonth`: 달력에 보이는 달·월 이동·앞 빈칸·일수 (`DatePicker`·`DateRangePicker`·`CalendarPage`가 같이 씀)
  - `useSelection`(선택 모드), `useModalDialog`, `useDismiss`, `useDayChange`, `usePersistentState`, `useMemos`
- `src/constants/labels.ts`: 우선순위·반복 주기·업무 종류·화면 이름의 라벨과 옵션 목록
- `src/utils/`: `date`(주 계산 포함), `recurrence`, `kind`(`normalizeKind`), `weeklyReport`(주간보고 글 생성), `calendar`(날짜별 캘린더 항목), `dashboard`(대시보드 숫자), `backup`(백업 파일·알림 판단), `leave`(연차 제목 만들기), `share`(복사·공유·엑셀 칸 복사와 토스트 문구), `list`(`moveItem`), `storage`(`writeStorage`)
- **화면 모양**: 각 화면의 맨 위 제목은 그 화면 자신이 `h1`로 그린다(앱 공통 헤더는 없음). 본문(`.todo-app`)은 최대 폭 없이 사이드바 옆 공간을 꽉 채운다(`$site_max_width`는 좁은 화면의 상단 메뉴에만 남아 있음). 할 일 화면의 `QuickNav`는 목록 위 가로 칩 줄
- `src/styles/`: `main.scss`가 `abstracts → base → components` 순서로 `@import`. 컴포넌트마다 `components/_이름.scss` 한 파일. 레이아웃 폭 기준은 `$break_shell`(1024px)과 `@include shell`

## 데이터 모델 메모
- 업무 종류 `kind`: `task`(일반, `[카테고리] 내용`) / `routine`(정기, `날짜 + 내용 완료`) / `leave`(연차·휴가, `날짜 + 내용`). 없거나 잘못된 값은 `task`. `Todo`·`RecurrenceSeries`·`CompletionLogEntry`에 모두 있고, 반복 회차와 완료 이력이 이어받음
- 연차·휴가의 이름·시각·사유는 `utils/leave.ts`가 **제목 한 줄**(`연차 14:00~15:00 (병원 진료)`)로 합쳐 저장한다(별도 필드 없음). 그래서 목록·완료 이력·백업·주간보고가 그대로 같이 쓴다. 등록 폼은 `LeaveForm`
- 연차·휴가는 날짜(`dueDate`) 필수·반복 불가. 완료 이력에도 `dueDate`를 남겨 정리된 연차가 주간보고에서 날짜를 잃지 않게 함
- 주간보고는 저장하는 데이터가 아니라 **완료 상태로 남은 할 일 + 완료 이력**에서 그때그때 계산함(`buildWeeklyReport`)

## 중복을 다시 만들지 않기
같은 일을 하는 코드를 새로 쓰기 전에 아래를 먼저 씁니다.

| 하려는 일 | 쓸 것 |
|---|---|
| 모달 열기/닫기 + 스크롤 잠금 | `useModalDialog(ref, isOpen)` |
| 메뉴·팝오버 바깥 클릭/Esc 닫기 | `useDismiss(ref, open, onClose, { escape })` |
| 자정·탭 복귀 때 갱신 | `useDayChange(callback)` |
| 우선순위·반복 주기 라벨, `<option>` 목록 | `constants/labels.ts` |
| 복사·공유 결과 토스트 문구 | `share.ts`의 `copyFeedback`/`shareFeedback`/`kakaoFeedback` |
| 배열 항목 순서 이동 | `moveItem` |
| localStorage 쓰기 | `writeStorage` |
| `'all'` 없는 카테고리 목록 | `useTodos`의 `categoryOptions` |
| 업무 종류 이름·`<option>` 목록, 값 정규화 | `KIND_LABEL`/`KIND_OPTIONS`, `normalizeKind` |
| 화면 이름·메뉴 목록 | `labels.ts`의 `VIEW_LABEL`/`VIEW_OPTIONS`, 현재 화면은 `useView` |
| 주 시작(월요일)·로컬 날짜·`2026.11.2` 표기 | `date.ts`의 `startOfWeek`/`toLocalDateStr`/`formatReportDate` |
| 여러 줄 글을 엑셀 한 칸으로 복사 | `share.ts`의 `toExcelCell` |
| 달력 칸(월 이동·빈칸·일수), 칸의 날짜 문자열 | `useCalendarMonth`, `date.ts`의 `dateStr` |
| 주·달 이동 막대 | `PeriodNav` |
| 백업 파일 내려받기, 백업 알림 판단 | `utils/backup.ts`의 `downloadBackup`/`backupReminder`, 상태는 `useBackupReminder` |
| 연차 제목(이름·시각·사유) 만들기, 같은 연차인지 판별 | `utils/leave.ts`의 `composeLeaveText`/`isSameLeave` |
| `transition` 여러 속성 | `@include transition(color background-color)` (공백으로 이은 한 인자, 쉼표 나열 금지) |
| 특정 폭(1024px) 이상에서만 적용하는 스타일 | `@include shell` (폭 값을 직접 쓰지 않음) |
| 화면에서만 숨기고 스크린리더에는 남기기 | `.screen-out` 클래스, SCSS에서는 `@include visually-hidden` |

## 테스트와 안전장치
- **`TodoItem.test.tsx`는 스냅샷 기반 동작 고정 테스트**입니다(`__snapshots__/`). 마크업을 일부러 바꾼 경우에만 diff를 검토한 뒤 `npx vitest run -u`로 갱신합니다. 의도하지 않았는데 깨졌다면 리팩터링 실수이니 코드를 고칩니다.
- SCSS 파일을 나누거나 옮길 때는 전후 CSS를 비교합니다: `npx sass --quiet --no-source-map src/styles/main.scss > 파일.css` 후 `cmp`. 같아야 합니다. `main.scss`의 `@import` 순서가 곧 캐스케이드 순서입니다. (`scss.md`는 `@use`를 언급하지만 이 프로젝트는 아직 `@import`를 씁니다.)
- 날짜에 의존하는 테스트는 `vi.useFakeTimers()` + `vi.setSystemTime(...)`으로 날짜를 고정하고, 끝나면 `vi.useRealTimers()`로 되돌립니다. 테스트 데이터의 회사·업체 이름은 가짜 이름을 씁니다(`참고자료` 규칙).
- 저장 데이터와의 호환을 깨지 않습니다. 키: `todolist-items`, `todolist-recurrence-series`, `todolist-memos-array`, `todolist-completion-log` 등(백업 알림용 `todolist-last-backup`, `todolist-backup-snooze`는 백업 파일에 들어가지 않는 설정값). 불러올 때는 `validate*`·`migrateTodo`를 거칩니다.

## 환경 주의 (Windows)
- vitest `globals`가 꺼져 있어서 Testing Library의 `cleanup()`을 `afterEach`에서 직접 호출해야 합니다.
- jsdom에는 `dialog.showModal()/close()`가 없어서 테스트에서 모킹합니다(`useModalDialog.test.ts`, `TodoItem.test.tsx` 참고).
- `core.autocrlf=true`라서 `LF will be replaced by CRLF` 경고는 정상입니다. 파일을 줄 단위로 자를 때 Git Bash의 `sed`는 `\r`을 지우니 `head`/`tail`을 씁니다.
- PowerShell에서 `npm`·`git`의 stderr 출력은 `NativeCommandError`처럼 보여도 실패가 아닌 경우가 많습니다. 결과 줄과 종료 코드로 판단합니다.
- `bash.exe.stackdump`는 Git Bash가 비정상 종료될 때 프로젝트 루트에 생기는 덤프 파일입니다. `.gitignore`에 있어 커밋되지는 않지만, **푸시할 때 프로젝트 안에 있으면 삭제**합니다.
- 개발 서버를 띄웠다면 **그 포트의 프로세스만** 종료합니다. `taskkill /IM chrome.exe`처럼 Chrome 전체를 끄지 않습니다.

## 알려진 상태
- **실기기 미확인**: 모바일 PWA와 카카오톡 공유는 직접 눌러 확인하지 못했습니다.
- **전용 테스트 없음**: `useRecurrenceSeries`는 `useTodos.test.ts`가 간접적으로만 검증합니다.
- **작은 동작 차이**: 하위 항목 입력창에 보내지 않은 글자가 있을 때 카드 편집 모드로 들어갔다 돌아오면 글자가 지워집니다(`TodoItemSubtasks`가 편집 중 언마운트되기 때문). 의도한 변경이 아니므로, 거슬리면 입력 상태를 `TodoItem`으로 올립니다.
- **엑셀 붙여넣기 미확인**: 주간보고 `엑셀 칸에 복사`가 실제 공동 엑셀(웹)에서 한 칸에 들어가는지 확인하지 못했습니다. 안 되면 `toExcelCell` 방식을 바꿉니다.
- **미확인 화면**: 사이드바·주간보고의 다크모드와 좁은 화면(1024px 미만)은 눈으로 확인하지 못했습니다.
- **작은 동작 차이**: 화면을 옮기면 `TodoPage`가 언마운트되어 할 일 입력창에 쓰다 만 글자가 지워집니다. 거슬리면 입력 상태를 `App`으로 올립니다.
- **작은 동작 차이**: 반복 회차 카드에서 종류를 바꾸면 그 회차만 바뀌고 시리즈 종류는 그대로입니다. 이전 완료 이력의 연차는 `dueDate`가 없어 주간보고에 들어가지 않습니다.
- **남은 계획**: 처음 계획한 1~6단계는 모두 만들었습니다(대시보드, 캘린더, 백업 알림 포함). 남은 것은 아래 정리 항목들입니다. 캘린더에서 등록한 연차를 지우는 기능은 아직 없고, 할 일 목록에서 삭제합니다.
- **시작 화면**: 메뉴 맨 위는 `대시보드`지만 처음 열리는 화면(`DEFAULT_VIEW`)은 `할 일`입니다. 바꾸려면 `labels.ts`의 `DEFAULT_VIEW`를 고칩니다.
- **보류한 작업**: `@import → @use` 전환, `_icons_new.scss`(약 2,700줄) 분리. 두 가지 모두 급하지 않음.

## 작업 흐름
1. 기능 작업을 마칩니다.
2. 커밋 전에 **직전 변경분만이 아니라 코드베이스 전체**에서 리팩터링할 곳이 있는지 점검합니다.
3. 리팩터링은 기능 커밋과 섞지 않고 별도 `refactor` 커밋으로 나눕니다. 큰 구조 변경은 **동작 고정 테스트를 먼저 커밋**한 뒤 진행합니다.
4. `git status`·`git diff`로 의도한 파일만 바뀌었는지 요약 보고하고, 푸시는 사용자 승인을 받은 뒤에 합니다. 푸시 직전에 프로젝트 루트에 `bash.exe.stackdump`가 있으면 지웁니다.
5. 사용자에게 보이는 변경만 `CHANGELOG.md`(`YY.MM.DD` 헤더)에 적습니다. 순수 리팩터링은 적지 않습니다.
