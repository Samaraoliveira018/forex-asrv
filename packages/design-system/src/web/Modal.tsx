import { useEffect, type ReactNode } from 'react';
import { classNames } from './classNames';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="asrv-modal" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={classNames(
          'asrv-modal__panel',
          size === 'sm' && 'asrv-modal__panel--sm',
          className,
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="asrv-modal__header">
          <h2 className="asrv-modal__title">{title}</h2>
          <button
            type="button"
            className="asrv-icon-button"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="asrv-modal__body">{children}</div>
        {footer ? <div className="asrv-modal__footer">{footer}</div> : null}
      </section>
    </div>
  );
}
