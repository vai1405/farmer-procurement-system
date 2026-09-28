import Modal from './Modal';

/**
 * Confirmation dialog for destructive or important actions
 * (delete centre, delete slot, cancel booking, etc).
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={showConfirm}
 *     title="Delete Centre?"
 *     message="This cannot be undone."
 *     confirmLabel="Delete"
 *     variant="danger"
 *     isProcessing={isDeleting}
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
const ConfirmDialog = ({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isProcessing = false,
  onConfirm,
  onCancel,
}) => (
  <Modal title={title} isOpen={isOpen} onClose={onCancel} size="modal-sm">
    <p className="text-muted">{message}</p>
    <div className="d-flex justify-content-end gap-2 mt-4">
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={onCancel}
        disabled={isProcessing}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        className={`btn btn-${variant}`}
        onClick={onConfirm}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" />
            Processing...
          </>
        ) : (
          confirmLabel
        )}
      </button>
    </div>
  </Modal>
);

export default ConfirmDialog;