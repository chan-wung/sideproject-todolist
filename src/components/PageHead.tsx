import type { ReactNode } from 'react';

interface Props {
  /** 화면 이름 (이 화면의 유일한 h1) */
  title: string;
  /** 제목 옆에 붙는 보조 정보 (예: 대시보드의 이번 주 기간) */
  children?: ReactNode;
}

// 모든 화면 맨 위의 제목 줄. 카드 밖(회색 배경 위)에 같은 위치·모양으로 보인다.
export default function PageHead({ title, children }: Props) {
  return (
    <div className="page-head">
      <h1 className="page-head__tit">{title}</h1>
      {children && <div className="page-head__util">{children}</div>}
    </div>
  );
}
