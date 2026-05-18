import { useId } from 'react'
import { PocoModal } from './PocoModal'
import { PocoDialogPanel } from './PocoDialogPanel'
import { pocoDialogTheme } from './pocoDialogTheme'

type PocoMessageDialogProps = {
  open: boolean
  title: string
  message: string
  buttonLabel?: string
  onClose: () => void
}

export function PocoMessageDialog({
  open,
  title,
  message,
  buttonLabel = 'OK',
  onClose,
}: PocoMessageDialogProps) {
  const id = useId()
  const titleId = `${id}-title`
  const descId = `${id}-desc`

  return (
    <PocoModal
      open={open}
      align="center"
      clearBottomNavOnMobile
      onBackdropClick={onClose}
    >
      <PocoDialogPanel role="alertdialog" labelledBy={titleId} describedBy={descId}>
        <h2 id={titleId} className={pocoDialogTheme.title}>
          {title}
        </h2>
        <p id={descId} className={pocoDialogTheme.description}>
          {message}
        </p>
        <div className={pocoDialogTheme.actions}>
          <button type="button" className={pocoDialogTheme.btnAccent} onClick={onClose}>
            {buttonLabel}
          </button>
        </div>
      </PocoDialogPanel>
    </PocoModal>
  )
}
