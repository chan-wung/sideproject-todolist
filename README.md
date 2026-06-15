# 투두리스트

Vite + React + TypeScript 기반의 사이드 프로젝트입니다.

## 기술 스택

- **React 18** + **TypeScript**
- **Vite 5**
- **SCSS** (BEM 네이밍, rem 단위)
- **localStorage** 데이터 영속성
- 폰트: Pretendard, GmarketSans

## 주요 기능

- 할 일 추가 / 수정 / 삭제
- 완료 체크 및 완료 항목 일괄 삭제
- 서브태스크 (체크리스트 + 진행도)
- 우선순위 설정 (높음 / 보통 / 낮음)
- 마감일 설정, 오늘/이번주/지연 마감 뷰 및 마감 요약 배너
- 카테고리 태그, 실시간 검색, 다양한 상태 필터링
- 필터·정렬·검색 상태 새로고침 후 유지 (localStorage)
- 백업 내보내기 / 가져오기
- 다크모드 토글

## 데이터 보호
모든 데이터는 사용자의 브라우저 localStorage에만 저장되며, 저장소나 서버로 전송되지 않습니다.

## 시작하기

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```
