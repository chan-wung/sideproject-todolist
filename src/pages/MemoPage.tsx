import { useEffect, useRef, useState } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import ConfirmModal from '../components/ConfirmModal';
import PageHead from '../components/PageHead';
import { ArrowDownIcon, ArrowUpIcon, ChevronIcon, MoreIcon, NoteIcon, PaperclipIcon, PushPinIcon } from '../components/icons';
import { generateId } from '../utils/id';
import { moveItem } from '../utils/list';
import { memoToText } from '../utils/share';
import type { Memo } from '../hooks/useMemos';
import type { Todo } from '../types/todo';
import { cx } from '../utils/classNames';

interface Props {
  memos: Memo[];
  setMemos: (memos: Memo[]) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  todos: Todo[];
  onLinkMemo: (todoId: string, memoId: string) => void;
  onUnlinkMemo: (todoId: string, memoId: string) => void;
  /** 복사·공유는 앱 공용 토스트로 결과를 알린다 */
  onCopyText: (text: string, successMessage: string) => void;
  onShareText: (title: string, text: string) => void;
  onKakaoShareText: (text: string) => void;
}

// 메모장 화면. 왼쪽에 메모 목록(검색·고정·드래그 정렬), 오른쪽에 제목·연결된 할 일·내용을 나란히 보여 준다.
export default function MemoPage({ memos, setMemos, activeId, setActiveId, todos, onLinkMemo, onUnlinkMemo, onCopyText, onShareText, onKakaoShareText }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [moreOpen, setMoreOpen] = useState(false);
  const [linkedCollapsed, setLinkedCollapsed] = useState(true);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  useDismiss(moreRef, moreOpen, () => setMoreOpen(false), { focusRef: moreBtnRef });

  // 화면에 들어오면 메모가 하나도 없을 때 빈 기본 메모를 만든다.
  // (옛 단일 메모 이행과 '고른 메모가 없으면 첫 메모 고르기'는 useMemos가 맡는다)
  useEffect(() => {
    if (memos.length === 0) {
      const newId = generateId();
      setMemos([{ id: newId, title: '기본 메모', content: '' }]);
      setActiveId(newId);
    }
  }, [memos, setMemos, setActiveId]);


  // 키보드·터치용 순서 이동: 전체 메모 목록에서 바로 위/아래 메모와 자리를 바꾼다 (검색 중에도 같은 기준)
  const activeIndex = memos.findIndex(m => m.id === activeId);
  function handleMoveActive(delta: number) {
    const to = activeIndex + delta;
    if (activeIndex === -1 || to < 0 || to >= memos.length) return;
    setMemos(moveItem(memos, activeIndex, to));
    setMoreOpen(false);
  }

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

  const handleCopyActive = (memo: Memo) => onCopyText(memoToText(memo), '메모를 클립보드에 복사했습니다.');
  const handleKakaoShareActive = (memo: Memo) => onKakaoShareText(memoToText(memo));
  const handleShareActive = (memo: Memo) => onShareText(memo.title || '메모 공유', memoToText(memo));

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
    setMemos(moveItem(memos, from, to));
    setDraggingId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  const activeMemo = memos.find(m => m.id === activeId);
  const filteredMemos = memos.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const confirmTarget = confirmDeleteId ? memos.find(m => m.id === confirmDeleteId) : null;

  return (
    <main className="memo-page">
      <PageHead title="메모장" />

      <div className="memo-page__box">
        <div className="memo-page__body">
          {/* 왼쪽: 탭(목록) 영역 */}
          <div className={`memo-page__sidebar${mobileControlsOpen ? ' memo-page__sidebar--expanded' : ''}`}>
            <button
              type="button"
              className={`memo-page__controls-toggle${mobileControlsOpen ? ' memo-page__controls-toggle--expanded' : ''}`}
              onClick={() => setMobileControlsOpen(prev => !prev)}
            >
              {mobileControlsOpen ? '메모 목록 접기' : <span><NoteIcon className="ico-text" />메모 목록 ({memos.length})</span>}
            </button>
            <div className={`memo-page__panel${mobileControlsOpen ? ' memo-page__panel--expanded' : ''}`}>
              <div className="memo-page__controls">
                <button type="button" className="memo-page__add" onClick={handleAdd}>+ 새 메모 추가</button>
                <div className="memo-page__search">
                  <input
                    className="memo-page__search-input"
                    type="text"
                    placeholder="메모 검색..."
                    aria-label="메모 검색"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <ul className="memo-page__list">
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
                  className={cx(
                    'memo-page__item',
                    m.id === activeId ? 'memo-page__item--active' : '',
                    m.pinned ? 'memo-page__item--pinned' : '',
                    m.id === draggingId ? 'memo-page__item--dragging' : '',
                    m.id === dragOverId ? 'memo-page__item--drag-over' : '',
                  )}
                >
                  <button type="button" className="memo-page__item-btn" onClick={() => { setActiveId(m.id); setMobileControlsOpen(false); }}>
                    <span className="memo-page__drag-handle" aria-hidden="true">⠿</span>
                    <span className="memo-page__item-tit">{m.title || '제목 없음'}</span>
                    {linkedCount > 0 && (
                      <span className="memo-page__item-count" aria-label={`연결된 할 일 ${linkedCount}개`}>
                        {linkedCount}
                      </span>
                    )}
                  </button>
                  <div className="memo-page__item-actions">
                    <button
                      type="button"
                      className={`memo-page__item-pin${m.pinned ? ' memo-page__item-pin--active' : ''}`}
                      onClick={() => toggleMemoPin(m.id)}
                      aria-label={m.pinned ? '고정 해제' : '메모 고정'}
                      title={m.pinned ? '고정 해제' : '메모 고정'}
                    >
                      <PushPinIcon />
                    </button>
                    <button
                      type="button"
                      className="memo-page__item-del"
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
          </div>

          {/* 오른쪽: 내용 영역 */}
          <div className={`memo-page__content${mobileControlsOpen ? ' memo-page__content--hidden-mobile' : ''}`}>
            {activeMemo ? (
              <>
                <div className="memo-page__title-row">
                  <input
                    className="memo-page__title-input"
                    aria-label="메모 제목"
                    value={activeMemo.title}
                    onChange={(e) => updateActiveMemo({ title: e.target.value })}
                    placeholder="메모 제목 (예: 서버 접속 정보, 가나다상사)"
                  />
                  <div className="memo-page__content-actions" ref={moreRef}>
                    <button
                      ref={moreBtnRef}
                      type="button"
                      className={`memo-page__more-btn${moreOpen ? ' memo-page__more-btn--active' : ''}`}
                      onClick={() => setMoreOpen(prev => !prev)}
                      aria-label="더보기"
                      aria-expanded={moreOpen}
                    >
                      <MoreIcon size={18} decorative />
                    </button>
                    {moreOpen && (
                      <div className="memo-page__more-menu">
                        <button type="button" className="memo-page__more-item" onClick={() => { setMoreOpen(false); handleCopyActive(activeMemo); }}>클립보드 복사</button>
                        <button type="button" className="memo-page__more-item" onClick={() => { setMoreOpen(false); handleShareActive(activeMemo); }}>공유</button>
                        <button type="button" className="memo-page__more-item" onClick={() => { setMoreOpen(false); handleKakaoShareActive(activeMemo); }}>카카오톡 공유</button>
                        <button type="button" className="memo-page__more-item" disabled={activeIndex <= 0} onClick={() => handleMoveActive(-1)}><ArrowUpIcon />목록에서 위로 이동</button>
                        <button type="button" className="memo-page__more-item" disabled={activeIndex === -1 || activeIndex >= memos.length - 1} onClick={() => handleMoveActive(1)}><ArrowDownIcon />목록에서 아래로 이동</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="memo-page__linked">
                  <button
                    type="button"
                    className="memo-page__linked-toggle"
                    onClick={() => setLinkedCollapsed(prev => !prev)}
                    aria-expanded={!linkedCollapsed}
                    aria-controls="memo-linked-checklist"
                  >
                    <span className="memo-page__linked-tit"><PaperclipIcon className="ico-text" />연결된 할 일</span>
                    <ChevronIcon className={`memo-page__linked-toggle-icon${linkedCollapsed ? ' memo-page__linked-toggle-icon--collapsed' : ''}`} />
                  </button>
                  {!linkedCollapsed && (
                    todos.length > 0 ? (
                      <div className="memo-page__linked-checklist" id="memo-linked-checklist">
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
                      <div className="memo-page__linked-empty">할 일이 없습니다.</div>
                    )
                  )}
                </div>
                <textarea
                  className="memo-page__textarea"
                  aria-label="메모 내용"
                  value={activeMemo.content}
                  onChange={(e) => updateActiveMemo({ content: e.target.value })}
                  placeholder="계정 정보, IP 주소 등을 이곳에 작성하세요..."
                  spellCheck={false}
                />
              </>
            ) : (
              <div className="memo-page__empty">선택된 메모가 없습니다.</div>
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
    </main>
  );
}
