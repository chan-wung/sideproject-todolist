import { usePersistentState } from '../hooks/usePersistentState';
import { useEffect, useRef, useState } from 'react';
import ConfirmModal from './ConfirmModal';

interface Memo {
  id: string;
  title: string;
  content: string;
  pinned?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickMemo({ isOpen, onClose }: Props) {
  const [memos, setMemos] = usePersistentState<Memo[]>('todolist-memos-array', []);
  const [activeId, setActiveId] = usePersistentState<string | null>('todolist-active-memo', null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      document.body.style.overflow = 'hidden';
      
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
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, memos, activeId, setMemos, setActiveId]);

  function handleAdd() {
    const newId = crypto.randomUUID();
    setMemos([...memos, { id: newId, title: '새 메모', content: '' }]);
    setActiveId(newId);
  }

  function handleDeleteConfirm(id: string) {
    const newMemos = memos.filter(m => m.id !== id);
    setMemos(newMemos);
    if (activeId === id) {
      setActiveId(newMemos.length > 0 ? newMemos[0].id : null);
    }
    if (newMemos.length === 0) {
      const newId = crypto.randomUUID();
      setMemos([{ id: newId, title: '새 메모', content: '' }]);
      setActiveId(newId);
    }
    setConfirmDeleteId(null);
  }

  function updateActiveMemo(updates: Partial<Memo>) {
    setMemos(memos.map(m => m.id === activeId ? { ...m, ...updates } : m));
  }

  function toggleMemoPin(id: string) {
    const targetIndex = memos.findIndex(m => m.id === id);
    if (targetIndex === -1) return;
    const target = memos[targetIndex];
    const isNowPinned = !target.pinned;
    
    const nextMemos = [...memos];
    nextMemos.splice(targetIndex, 1);
    
    if (isNowPinned) {
      nextMemos.unshift({ ...target, pinned: true });
    } else {
      // 고정 해제 시에는 맨 뒤로 보내거나 고정된 항목들 바로 뒤에 두는 방식 중
      // 간단하게 고정 항목들 맨 뒤(혹은 배열 맨 뒤)로 보냅니다.
      // 여기서는 명시적으로 배열 맨 뒤로 보냅니다.
      nextMemos.push({ ...target, pinned: false });
    }
    
    setMemos(nextMemos);
  }

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (id !== draggingId) setDragOverId(id);
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const from = memos.findIndex(m => m.id === draggingId);
    const to = memos.findIndex(m => m.id === targetId);
    if (from === -1 || to === -1) return;
    const next = [...memos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setMemos(next);
    setDraggingId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  const activeMemo = memos.find(m => m.id === activeId);
  const filteredMemos = memos.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  if (!isOpen) return null;

  const confirmTarget = confirmDeleteId ? memos.find(m => m.id === confirmDeleteId) : null;

  return (
    <dialog ref={dialogRef} className="quick-memo-modal" onCancel={onClose} onClick={handleBackdropClick}>
      <div className="quick-memo-modal__container">
        <div className="quick-memo-modal__header">
          <h2>📝 메모장 (탭 관리)</h2>
          <button className="quick-memo-modal__close" onClick={onClose} type="button" aria-label="닫기"><span aria-hidden="true">&times;</span></button>
        </div>
        
        <div className="quick-memo-modal__body">
          {/* 왼쪽: 탭(목록) 영역 */}
          <div className="quick-memo-modal__sidebar">
            <button type="button" className="quick-memo-modal__add" onClick={handleAdd}>+ 새 메모 추가</button>
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
                  draggable
                  onDragStart={() => handleDragStart(m.id)}
                  onDragOver={(e) => handleDragOver(e, m.id)}
                  onDrop={() => handleDrop(m.id)}
                  onDragEnd={handleDragEnd}
                  className={[
                    'quick-memo-modal__item',
                    m.id === activeId ? 'quick-memo-modal__item--active' : '',
                    m.pinned ? 'quick-memo-modal__item--pinned' : '',
                    m.id === draggingId ? 'quick-memo-modal__item--dragging' : '',
                    m.id === dragOverId ? 'quick-memo-modal__item--drag-over' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setActiveId(m.id)}
                >
                  <span className="quick-memo-modal__drag-handle" aria-hidden="true">⠿</span>
                  <span className="quick-memo-modal__item-tit">{m.title || '제목 없음'}</span>
                  <button
                    type="button"
                    className={`quick-memo-modal__item-pin${m.pinned ? ' quick-memo-modal__item-pin--active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleMemoPin(m.id); }}
                    aria-label={m.pinned ? '고정 해제' : '메모 고정'}
                  >
                    <span aria-hidden="true">📌</span>
                  </button>
                  <button
                    type="button"
                    className="quick-memo-modal__item-del"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(m.id); }}
                    aria-label="메모 삭제"
                  ><span aria-hidden="true">&times;</span></button>
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
      {confirmTarget && (
        <ConfirmModal
          message={`"${confirmTarget.title}" 메모를 삭제할까요?`}
          onConfirm={() => handleDeleteConfirm(confirmTarget.id)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </dialog>
  );
}
