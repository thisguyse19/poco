import { useId, type ReactNode } from 'react'
import { PocoAnimatedCenterModal } from './PocoAnimatedCenterModal'
import { PocoDialogPanel } from './PocoDialogPanel'
import { pocoDialogTheme } from './pocoDialogTheme'

type PocoMessageDialogBaseProps = {
  open: boolean
  title: string
  buttonLabel?: string
  onClose: () => void
  panelMaxWidthClass?: string
  /** Extra classes on the dialog panel (e.g. max height for scrollable bodies). */
  panelClassName?: string
  panelRole?: 'dialog' | 'alertdialog'
}

export type PocoMessageDialogProps = PocoMessageDialogBaseProps &
  ({ message: string } | { body: ReactNode })

export function PocoMessageDialog(props: PocoMessageDialogProps) {
  const {
    open,
    title,
    buttonLabel = 'OK',
    onClose,
    panelMaxWidthClass = 'max-w-sm',
    panelClassName = '',
    panelRole = 'alertdialog',
  } = props
  const message = 'message' in props ? props.message : undefined
  const body = 'body' in props ? props.body : undefined

  const id = useId()
  const titleId = `${id}-title`
  const descId = `${id}-desc`

  return (
    <PocoAnimatedCenterModal open={open} onBackdropClick={onClose} panelMaxWidthClass={panelMaxWidthClass}>
      <PocoDialogPanel
        role={panelRole}
        labelledBy={titleId}
        describedBy={descId}
        className={panelClassName}
      >
        <h2 id={titleId} className={pocoDialogTheme.title}>
          {title}
        </h2>
        {body !== undefined ? (
          <div id={descId}>{body}</div>
        ) : (
          <p id={descId} className={pocoDialogTheme.description}>
            {message}
          </p>
        )}
        <div className={pocoDialogTheme.actions}>
          <button type="button" className={pocoDialogTheme.btnAccent} onClick={onClose}>
            {buttonLabel}
          </button>
        </div>
      </PocoDialogPanel>
    </PocoAnimatedCenterModal>
  )
}
