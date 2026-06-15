import { usePersistentState } from '../hooks/usePersistentState';
import { useEffect, useRef, useState } from 'react';

interface Memo {
  id: string;
  title: string;
  content: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickMemo({ isOpen, onClose }: Props) {
  const [memos, setMemos] = usePersistentState<Memo[]>('todolist-memos-array', []);
  const [activeId, setActiveId] = usePersistentState<string | null>('todolist-active-memo', null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      
      // 만약 메모가 하나도 없다면 기본 메모 1개 생성 (이전 단일 메모 내용이 있다면 복원)
      if (memos.length === 0) {
        let oldContent = '';
        try {
          const raw = localStorage.getItem('todolist-memo-content');
          if (raw) oldContent = JSON.parse(raw);
        } catch {
          // ignore
        }
        const newId = crypto.randomUUID();
        setMemos([{ id: newId, title: '기본 메모', content: oldContent }]);
        setActiveId(newId);
      } else if (!activeId || !memos.find(m => m.id === activeId)) {
        setActiveId(memos[0].id);
      }
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, memos.length, activeId, setMemos, setActiveId]);

  function handleAdd() {
    const newId = crypto.randomUUID();
    setMemos([...memos, { id: newId, title: '새 메모', content: '' }]);
    setActiveId(newId);
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('이 메모를 삭제하시겠습니까?')) return;
    const newMemos = memos.filter(m => m.id !== id);
    setMemos(newMemos);
    
    if (activeId === id) {
      setActiveId(newMemos.length > 0 ? newMemos[0].id : null);
    }
    
    // 마지막 메모를 지웠다면 빈 메모 하나 자동 생성
    if (newMemos.length === 0) {
      const newId = crypto.randomUUID();
      setMemos([{ id: newId, title: '새 메모', content: '' }]);
      setActiveId(newId);
    }
  }

  function updateActiveMemo(updates: Partial<Memo>) {
    setMemos(memos.map(m => m.id === activeId ? { ...m, ...updates } : m));
  }

  const activeMemo = memos.find(m => m.id === activeId);
  const filteredMemos = memos.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <dialog ref={dialogRef} className="quick-memo-modal" onCancel={onClose} onClick={handleBackdropClick}>
      <div className="quick-memo-modal__container">
        <div className="quick-memo-modal__header">
          <h2>📝 메모장 (탭 관리)</h2>
          <button className="quick-memo-modal__close" onClick={onClose} type="button">&times;</button>
        </div>
        
        <div className="quick-memo-modal__body">
          {/* 왼쪽: 탭(목록) 영역 */}
          <div className="quick-memo-modal__sidebar">
            <button className="quick-memo-modal__add" onClick={handleAdd}>+ 새 메모 추가</button>
            <div className="quick-memo-modal__search">
              <input 
                type="text" 
                placeholder="메모 검색..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <ul className="quick-memo-modal__list">
              {filteredMemos.map(m => (
                <li 
                  key={m.id} 
                  className={`quick-memo-modal__item ${m.id === activeId ? 'quick-memo-modal__item--active' : ''}`}
                  onClick={() => setActiveId(m.id)}
                >
                  <span className="quick-memo-modal__item-tit">{m.title || '제목 없음'}</span>
                  <button 
                    className="quick-memo-modal__item-del" 
                    onClick={(e) => handleDelete(m.id, e)}
                    title="삭제"
                  >&times;</button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* 오른쪽: 내용 영역 */}
          <div className="quick-memo-modal__content">
            {activeMemo ? (
              <>
                <input 
                  className="quick-memo-modal__title-input" 
                  value={activeMemo.title} 
                  onChange={(e) => updateActiveMemo({ title: e.target.value })}
                  placeholder="메모 제목 (예: 배워봄, 현대자동차)" 
                />
                <textarea
                  className="quick-memo-modal__textarea"
                  value={activeMemo.content}
                  onChange={(e) => updateActiveMemo({ content: e.target.value })}
                  placeholder="계정 정보, IP 주소 등을 이곳에 작성하세요..."
                  spellCheck={false}
                />
              </>
            ) : (
              <div className="quick-memo-modal__empty">선택된 메모가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
