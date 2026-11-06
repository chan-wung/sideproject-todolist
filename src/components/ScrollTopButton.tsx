import { smoothScrollBehavior } from '../utils/motion';
import { useEffect, useState } from 'react';

// 스크롤이 조금이라도 내려가 있을 때만 나타나는 '맨 위로' 버튼
export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 초기 로드 시에도 한 번 체크
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-top-btn"
      onClick={() => window.scrollTo({ top: 0, behavior: smoothScrollBehavior() })}
      aria-label="맨 위로"
    >
      ↑
    </button>
  );
}
