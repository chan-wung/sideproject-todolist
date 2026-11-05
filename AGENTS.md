# Codex 작업 환경

이 저장소의 개발 규칙과 작업 방식의 단일 원본은 `CLAUDE.md`입니다. Codex는 작업을 시작하기 전에 반드시 프로젝트 루트의 `CLAUDE.md`를 읽고, 그 문서가 가리키는 규칙과 자료를 작업 범위에 맞게 확인합니다. 이 파일에는 원본 규칙을 복제하지 않습니다.

## 필수 참조 순서

1. `CLAUDE.md`
2. 상위 폴더 `D:\wungsGit\CLAUDE.md` — `GEMINI.md`에 적힌 작업은 읽기만 가능하며 구현하지 않는다.
3. 작업 성격에 맞는 `.claude/rules/git.md`, `.claude/rules/html.md`, `.claude/rules/scss.md`
4. 기능 및 변경 이력이 필요한 경우 `README.md`, `CHANGELOG.md`, `BACKLOG.md`
5. UI·디자인 작업은 `DESIGN.md`와 해당 OMD 스킬

## Claude 환경 계승

- `.claude/`는 Claude Code의 원본 설정·에이전트·훅·규칙이므로 수정하거나 삭제하지 않는다.
- `.claude/skills/`와 동일한 Codex 호환 스킬이 `.agents/skills/`에 있다. 해당 스킬의 설명과 트리거에 맞는 요청이면 그 스킬을 사용하고, 관련 `SKILL.md`를 먼저 읽는다.
- `.claude/settings.json`의 훅은 Codex에서 자동 실행되지 않는다. 훅의 동작을 자동으로 수행했다고 가정하지 말고, 원본 규칙과 스킬의 지시를 직접 따른다.
- `.claude/agents/`의 Claude 전용 서브에이전트 정의는 자동 등록되는 Codex 에이전트가 아니다. 삭제·복제하지 말고, 대응하는 OMD 스킬과 원본 정의를 참고해 가능한 워크플로를 유지한다.

## 작업 원칙

- 프로젝트 코드·규칙·스킬을 바꾸기 전에 기존 구현과 관련 문서를 먼저 확인한다.
- 기존 헬퍼·컴포넌트·상수·테스트 패턴을 재사용하며, 같은 역할의 구현을 새로 만들지 않는다.
- 사용자 승인 없이 커밋하거나 푸시하지 않는다. Git 작업 전 `git status`와 `git diff`로 범위를 확인한다.
- 사용자에게 보이는 기능 변경만 `CHANGELOG.md`에 기록하고, 순수 리팩터링은 기록하지 않는다.
- 변경 범위에 맞춰 `npm run lint`, `npm run test`, `npm run build`를 실행한다. 커밋 전에는 세 명령을 모두 통과시킨다.
- `참고자료/`는 사용자 제공 참조 전용이며 커밋하지 않는다. 스테이징 전 `git status`로 포함 여부를 확인한다.
- Windows와 `localStorage` 데이터 취급 주의사항은 `CLAUDE.md`의 지시를 따른다.
