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
- 주간보고 양식 스크린샷: 엑셀 한 칸(주 단위) 안에 `날짜 + 정기업무` 줄, 빈 줄, `[프로젝트] 내용` 줄들이 여러 줄로 들어갑니다. 주간보고 기능의 출력 형식 기준입니다.

## 코드 구조 (2026-11 리팩터링 이후)
- `src/App.tsx`: 화면 조립, 백업 가져오기/내보내기, 토스트
- `src/components/`
  - `TodoItem.tsx`: 할 일 카드(조립만 담당). 편집 폼 `TodoItemEditForm`, 하위 항목 `TodoItemSubtasks`, 더보기 메뉴 `TodoItemMenu`로 분리됨
  - `icons.tsx`: 인라인 SVG 아이콘 컴포넌트
  - `*Modal.tsx`: 모달 계열. 모두 `<dialog>` + `useModalDialog`
- `src/hooks/`
  - `useTodos`: 할 일 상태와 필터·정렬·실행취소·완료 이력. 시리즈와 할 일을 **함께** 바꾸는 작업(승격·삭제·초기화·시작 시 마이그레이션)도 여기 있음
  - `useRecurrenceSeries`: 반복 시리즈 상태·저장·회차 생성·CRUD. `useTodos`가 내부에서 호출함
  - `useSelection`(선택 모드), `useModalDialog`, `useDismiss`, `useDayChange`, `usePersistentState`, `useMemos`
- `src/constants/labels.ts`: 우선순위·반복 주기 라벨과 옵션 목록
- `src/utils/`: `date`, `recurrence`, `share`(복사·공유와 토스트 문구), `list`(`moveItem`), `storage`(`writeStorage`)
- `src/styles/`: `main.scss`가 `abstracts → base → components` 순서로 `@import`. 컴포넌트마다 `components/_이름.scss` 한 파일

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

## 테스트와 안전장치
- **`TodoItem.test.tsx`는 스냅샷 기반 동작 고정 테스트**입니다(`__snapshots__/`). 마크업을 일부러 바꾼 경우에만 diff를 검토한 뒤 `npx vitest run -u`로 갱신합니다. 의도하지 않았는데 깨졌다면 리팩터링 실수이니 코드를 고칩니다.
- SCSS 파일을 나누거나 옮길 때는 전후 CSS를 비교합니다: `npx sass --quiet --no-source-map src/styles/main.scss > 파일.css` 후 `cmp`. 같아야 합니다. `main.scss`의 `@import` 순서가 곧 캐스케이드 순서입니다. (`scss.md`는 `@use`를 언급하지만 이 프로젝트는 아직 `@import`를 씁니다.)
- 저장 데이터와의 호환을 깨지 않습니다. 키: `todolist-items`, `todolist-recurrence-series`, `todolist-memos-array`, `todolist-completion-log` 등. 불러올 때는 `validate*`·`migrateTodo`를 거칩니다.

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
- **보류한 작업**: `@import → @use` 전환, `_icons_new.scss`(약 2,700줄) 분리. 두 가지 모두 급하지 않음.

## 작업 흐름
1. 기능 작업을 마칩니다.
2. 커밋 전에 **직전 변경분만이 아니라 코드베이스 전체**에서 리팩터링할 곳이 있는지 점검합니다.
3. 리팩터링은 기능 커밋과 섞지 않고 별도 `refactor` 커밋으로 나눕니다. 큰 구조 변경은 **동작 고정 테스트를 먼저 커밋**한 뒤 진행합니다.
4. `git status`·`git diff`로 의도한 파일만 바뀌었는지 요약 보고하고, 푸시는 사용자 승인을 받은 뒤에 합니다. 푸시 직전에 프로젝트 루트에 `bash.exe.stackdump`가 있으면 지웁니다.
5. 사용자에게 보이는 변경만 `CHANGELOG.md`(`YY.MM.DD` 헤더)에 적습니다. 순수 리팩터링은 적지 않습니다.
