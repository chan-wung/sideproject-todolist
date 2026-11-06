import { useId, useRef, useState } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { cx } from '../utils/classNames';
import { DownloadIcon, UploadIcon, RepeatIcon, HistoryIcon, SettingsIcon, UserIcon } from './icons';

/** 사이드바와 툴바 두 군데에서 같이 쓰는 값·동작 */
export interface ProfileMenuShared {
  name: string;
  onNameChange: (name: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onRecurrenceOpen: () => void;
  onCompletionLogOpen: () => void;
  onSettingsOpen: () => void;
}

interface Props extends ProfileMenuShared {
  /** nav: 사이드바 맨 아래(1024px 이상) / toolbar: 상단 툴바 오른쪽 끝(1024px 미만) */
  placement: 'nav' | 'toolbar';
  /** 사이드바를 접은 상태 (이름 대신 첫 글자만 보인다) */
  collapsed?: boolean;
}

// 프로필 버튼 + 드롭다운. 이름을 고치고, 백업(내보내기·가져오기)·반복 일정·완료 이력·설정을 여기서 연다. (다크모드는 툴바에 따로 있다)
// 메뉴 상자는 닫혀 있어도 DOM에 남겨 둔다(가져오기의 파일 입력이 파일을 고르는 동안 사라지면 안 된다).
export default function ProfileMenu({
  placement, collapsed = false, name, onNameChange,
  onExport, onImport, onRecurrenceOpen, onCompletionLogOpen, onSettingsOpen,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const boxId = useId();
  useDismiss(ref, open, () => setOpen(false), { focusRef: buttonRef });

  const trimmed = name.trim();
  const label = trimmed ? `${trimmed} 님` : '이름 입력';
  const initial = trimmed.charAt(0);

  // 항목을 누르면 실행하고 메뉴를 닫는다
  const run = (action: () => void) => () => {
    action();
    setOpen(false);
  };

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 change가 일어나게 비운다
    setOpen(false);
    if (file) onImport(file);
  }

  return (
    <div ref={ref} className={cx('profile-menu', `profile-menu--${placement}`, collapsed && 'profile-menu--collapsed')}>
      <button
        ref={buttonRef}
        type="button"
        className="profile-menu__btn"
        aria-expanded={open}
        aria-controls={boxId}
        title="프로필 메뉴"
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="profile-menu__txt">{label}</span>
        <span className="profile-menu__initial" aria-hidden="true">{initial || <UserIcon />}</span>
      </button>

      <div id={boxId} className="profile-menu__box" hidden={!open}>
        <label className="profile-menu__name">
          <span className="profile-menu__name-label">이름</span>
          <input
            className="profile-menu__input"
            type="text"
            value={name}
            maxLength={20}
            placeholder="이름을 입력하세요"
            autoComplete="off"
            onChange={e => onNameChange(e.target.value)}
          />
        </label>
        <ul className="profile-menu__list">
          <li className="profile-menu__item">
            <button type="button" className="profile-menu__link" onClick={run(onExport)}>
              <span className="profile-menu__ico"><DownloadIcon /></span>
              내보내기
            </button>
          </li>
          <li className="profile-menu__item">
            <label className="profile-menu__link">
              <span className="profile-menu__ico"><UploadIcon /></span>
              가져오기
              <input type="file" accept="application/json" className="screen-out" onChange={handleFile} />
            </label>
          </li>
          <li className="profile-menu__item">
            <button type="button" className="profile-menu__link" onClick={run(onRecurrenceOpen)}>
              <span className="profile-menu__ico"><RepeatIcon /></span>
              반복 일정
            </button>
          </li>
          <li className="profile-menu__item">
            <button type="button" className="profile-menu__link" onClick={run(onCompletionLogOpen)}>
              <span className="profile-menu__ico"><HistoryIcon /></span>
              완료 이력
            </button>
          </li>
          <li className="profile-menu__item">
            <button type="button" className="profile-menu__link" onClick={run(onSettingsOpen)}>
              <span className="profile-menu__ico"><SettingsIcon size="1em" /></span>
              설정
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
