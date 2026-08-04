import { useEffect, useRef, useState } from 'react';

interface Props {
  categories: string[];
  value: string;
  onApply: (category: string) => void;
  onClose: () => void;
}

const CUSTOM = '__custom__';

export default function CategoryPickerModal({ categories, value, onApply, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isPreset = categories.includes(value);
  const [selected, setSelected] = useState(isPreset ? value : CUSTOM);
  const [customText, setCustomText] = useState(isPreset ? '' : value);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      if (!dialog.open) return;
      dialog.close();
    };
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleApply() {
    const next = selected === CUSTOM ? customText.trim() : selected;
    if (!next) return;
    onApply(next);
    onClose();
  }

  return (
    <dialog ref={dialogRef} className="category-picker-modal" onClick={handleBackdropClick} onCancel={onClose}>
      <div className="category-picker-modal__container">
        <div className="category-picker-modal__header">
          <h2 className="category-picker-modal__tit">카테고리 선택</h2>
          <button type="button" className="category-picker-modal__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="category-picker-modal__body">
          <ul className="category-picker-modal__list">
            {categories.map(c => (
              <li key={c}>
                <label className="form-chk form-chk--radio">
                  <input
                    type="radio"
                    name="category-picker"
                    checked={selected === c}
                    onChange={() => setSelected(c)}
                  />
                  <span className="form-chk__text">{c}</span>
                </label>
              </li>
            ))}
            <li className="category-picker-modal__custom">
              <label className="form-chk form-chk--radio">
                <input
                  type="radio"
                  name="category-picker"
                  checked={selected === CUSTOM}
                  onChange={() => setSelected(CUSTOM)}
                />
                <span className="form-chk__text">직접 입력</span>
              </label>
              <input
                type="text"
                className="category-picker-modal__custom-field"
                placeholder="새 카테고리"
                value={customText}
                onChange={e => { setCustomText(e.target.value); setSelected(CUSTOM); }}
                onFocus={() => setSelected(CUSTOM)}
                autoComplete="off"
              />
            </li>
          </ul>
        </div>
        <div className="category-picker-modal__footer">
          <button className="btn btn--outline-gray btn--sm" type="button" onClick={onClose}>취소</button>
          <button className="btn btn--main btn--sm" type="button" onClick={handleApply}>적용</button>
        </div>
      </div>
    </dialog>
  );
}
