import { useEffect, useRef, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import { generateId } from '../utils/id';
import { memoToText, copyText, shareText } from '../utils/share';
import { shareToKakao } from '../utils/kakao';
import type { Memo } from '../hooks/useMemos';
import type { Todo } from '../types/todo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  memos: Memo[];
  setMemos: (memos: Memo[]) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  todos: Todo[];
  onLinkMemo: (todoId: string, memoId: string) => void;
  onUnlinkMemo: (todoId: string, memoId: string) => void;
}

export default function QuickMemo({ isOpen, onClose, memos, setMemos, activeId, setActiveId, todos, onLinkMemo, onUnlinkMemo }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 모달이 top layer에 떠 있는 동안에는 앱 레벨 토스트가 backdrop에 가려지므로 자체 토스트를 사용한다.
  const [feedback, setFeedback] = useState<{ id: string; message: string; type: 'primary' | 'success' | 'danger' } | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialogRef.current?.close();
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (memos.length === 0) {
        let oldContent = '';
        try {
          const raw = localStorage.getItem('todolist-memo-content');
          if (raw) oldContent = JSON.parse(raw);
        } catch {
          // ignore
        }
        const newId = generateId();
        setMemos([{ id: newId, title: '기본 메모', content: oldContent }]);
        setActiveId(newId);
      } else if (!activeId || !memos.find(m => m.id === activeId)) {
        setActiveId(memos[0].id);
      }
    }
  }, [isOpen, memos, activeId, setMemos, setActiveId]);


  function handleAdd() {
    const newId = generateId();
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
      const newId = generateId();
      setMemos([{ id: newId, title: '새 메모', content: '' }]);
      setActiveId(newId);
    }
    setConfirmDeleteId(null);
  }

  function updateActiveMemo(updates: Partial<Memo>) {
    setMemos(memos.map(m => m.id === activeId ? { ...m, ...updates } : m));
  }

  function handleDuplicate(id: string) {
    const index = memos.findIndex(m => m.id === id);
    if (index === -1) return;
    const src = memos[index];
    const newId = generateId();
    const next = [...memos];
    next.splice(index + 1, 0, { ...src, id: newId, title: `${src.title || '제목 없음'} (복사)`, pinned: undefined });
    setMemos(next);
    setActiveId(newId);
    setFeedback({ id: generateId(), message: '메모를 복사해서 추가했습니다.', type: 'success' });
  }

  async function handleCopyActive(memo: Memo) {
    const ok = await copyText(memoToText(memo));
    setFeedback(ok
      ? { id: generateId(), message: '메모를 클립보드에 복사했습니다.', type: 'success' }
      : { id: generateId(), message: '복사에 실패했습니다.', type: 'danger' });
  }

  async function handleKakaoShareActive(memo: Memo) {
    const ok = await shareToKakao(memoToText(memo));
    if (!ok) {
      setFeedback({ id: generateId(), message: '카카오톡 공유를 열지 못했습니다. 네트워크 또는 도메인 등록을 확인하세요.', type: 'danger' });
    }
  }

  async function handleShareActive(memo: Memo) {
    const result = await shareText(memo.title || '메모 공유', memoToText(memo));
    if (result === 'shared' || result === 'canceled') return;
    setFeedback(result === 'copied'
      ? { id: generateId(), message: '공유를 지원하지 않는 환경이라 클립보드에 복사했습니다.', type: 'primary' }
      : { id: generateId(), message: '공유에 실패했습니다.', type: 'danger' });
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
                className="quick-memo-modal__search-input"
                type="text" 
                placeholder="메모 검색..." 
                aria-label="메모 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <ul className="quick-memo-modal__list">
              {filteredMemos.map(m => {
                const linkedCount = todos.filter(t => (t.memoIds ?? []).includes(m.id)).length;
                return (
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
                >
                  <button type="button" className="quick-memo-modal__item-btn" onClick={() => setActiveId(m.id)}>
                    <span className="quick-memo-modal__drag-handle" aria-hidden="true">⠿</span>
                    <span className="quick-memo-modal__item-tit">{m.title || '제목 없음'}</span>
                    {linkedCount > 0 && (
                      <span className="quick-memo-modal__item-count" aria-label={`연결된 할 일 ${linkedCount}개`}>
                        {linkedCount}
                      </span>
                    )}
                  </button>
                  <div className="quick-memo-modal__item-actions">
                    <button
                      type="button"
                      className="quick-memo-modal__item-copy"
                      onClick={() => handleDuplicate(m.id)}
                      aria-label="메모 복사"
                      title="메모 복사 (같은 메모를 하나 더 만듭니다)"
                    >
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`quick-memo-modal__item-pin${m.pinned ? ' quick-memo-modal__item-pin--active' : ''}`}
                      onClick={() => toggleMemoPin(m.id)}
                      aria-label={m.pinned ? '고정 해제' : '메모 고정'}
                      title={m.pinned ? '고정 해제' : '메모 고정'}
                    >
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="quick-memo-modal__item-del"
                      onClick={() => setConfirmDeleteId(m.id)}
                      aria-label="메모 삭제"
                      title="메모 삭제"
                    ><span aria-hidden="true">&times;</span></button>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>
          
          {/* 오른쪽: 내용 영역 */}
          <div className="quick-memo-modal__content">
            {activeMemo ? (
              <>
                <div className="quick-memo-modal__title-row">
                  <input
                    className="quick-memo-modal__title-input"
                    value={activeMemo.title}
                    onChange={(e) => updateActiveMemo({ title: e.target.value })}
                    placeholder="메모 제목 (예: 배워봄, 현대자동차)"
                  />
                  <div className="quick-memo-modal__content-actions">
                    <button type="button" className="btn btn--outline-gray btn--sm" onClick={() => handleCopyActive(activeMemo)} title="메모 내용을 클립보드에 복사">클립보드 복사</button>
                    <button type="button" className="btn btn--outline-gray btn--sm" onClick={() => handleShareActive(activeMemo)} title="다른 앱으로 공유">공유</button>
                    <button type="button" className="btn btn--outline-gray btn--sm" onClick={() => handleKakaoShareActive(activeMemo)} title="카카오톡으로 공유">카카오톡</button>
                  </div>
                </div>
                <div className="quick-memo-modal__linked">
                  <span className="quick-memo-modal__linked-tit">📎 연결된 할 일</span>
                  {todos.length > 0 ? (
                    <div className="quick-memo-modal__linked-checklist">
                      {todos.map(t => {
                        const isLinked = activeId != null && (t.memoIds ?? []).includes(activeId);
                        return (
                          <label key={t.id} className="form-chk form-chk--checkbox">
                            <input
                              type="checkbox"
                              checked={isLinked}
                              onChange={() => {
                                if (!activeId) return;
                                if (isLinked) {
                                  onUnlinkMemo(t.id, activeId);
                                } else {
                                  onLinkMemo(t.id, activeId);
                                }
                              }}
                            />
                            <span className="form-chk__text">{t.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="quick-memo-modal__linked-empty">할 일이 없습니다.</div>
                  )}
                </div>
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
      {feedback && (
        <Toast
          key={feedback.id}
          message={feedback.message}
          type={feedback.type}
          onClose={() => setFeedback(null)}
        />
      )}
    </dialog>
  );
}
