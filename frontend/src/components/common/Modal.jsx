import { useEffect } from 'react';

/**
 * Lightweight, dependency-free modal (no Bootstrap JS bundle required).
 *
 * Usage:
 *   <Modal title="Add Centre" isOpen={isOpen} onClose={close}>
 *     <form>...</form>
 *   </Modal>
 *
 * Closes on Escape and on backdrop click. Body scroll is locked while open.
 */
const Modal = ({ title, isOpen, onClose, children, size = '' }) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="app-modal-backdrop" onMouseDown={onClose}>
      <div
        className={`app-modal-dialog ${size}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="app-modal-header">
          <h5 className="mb-0 fw-bold">{title}</h5>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          />
        </div>
        <div className="app-modal-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;