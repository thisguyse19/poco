import { useId } from 'react'
import { PocoAnimatedCenterModal } from './PocoAnimatedCenterModal'
import { PocoDialogPanel } from './PocoDialogPanel'
import { pocoDialogTheme } from './pocoDialogTheme'

type PocoConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'accent' | 'danger'
  onCancel: () => void
  onConfirm: () => void
}

export function PocoConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'accent',
  onCancel,
  onConfirm,
}: PocoConfirmDialogProps) {
  const id = useId()
  const titleId = `${id}-title`
  const descId = `${id}-desc`

  return (
    <PocoAnimatedCenterModal open={open} onBackdropClick={onCancel}>
      <PocoDialogPanel role="alertdialog" labelledBy={titleId} describedBy={descId}>
        <h2 id={titleId} className={pocoDialogTheme.title}>
          {title}
        </h2>
        <p id={descId} className={pocoDialogTheme.description}>
          {description}
        </p>
        <div className={pocoDialogTheme.actions}>
          <button type="button" className={pocoDialogTheme.btnSecondary} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === 'danger' ? pocoDialogTheme.btnDanger : pocoDialogTheme.btnAccent}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </PocoDialogPanel>
    </PocoAnimatedCenterModal>
  )
}
