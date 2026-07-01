import { useEffect } from 'react';

interface Props {
  message: string;
  onClose: () => void;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Toast({ message, onClose, duration = 2500, actionLabel, onAction }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  function handleAction() {
    onAction?.();
    onClose();
  }

  return (
    <div className="toast" role="alert">
      <span className="toast__icon">!</span>
      <span className="toast__msg">{message}</span>
      {actionLabel && onAction && (
        <button type="button" className="toast__action" onClick={handleAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
