import { useEffect, useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { getReleaseNotesAfter, POCO_VERSION_CODE } from '../../version'
import { PocoWhatsNewDialog } from './PocoWhatsNewDialog'

const DISMISS_KEY = 'poco-version-notes-dismissed-code'

/**
 * After a deploy, if the running build is newer than the last “What’s new” dismissal,
 * show release notes once. First launch with this feature seeds dismissal without a modal.
 */
export function WhatsNewGate() {
  const onboardingComplete = useSettingsStore((s) => s.settings.onboardingComplete)
  const [open, setOpen] = useState(false)
  const [sinceCode, setSinceCode] = useState(0)

  useEffect(() => {
    if (!onboardingComplete || typeof window === 'undefined') return
    let cancelled = false
    const id = window.requestAnimationFrame(() => {
      if (cancelled) return
      const raw = window.localStorage.getItem(DISMISS_KEY)
      if (raw === null) {
        window.localStorage.setItem(DISMISS_KEY, String(POCO_VERSION_CODE))
        return
      }
      const dismissed = Number(raw)
      if (!Number.isFinite(dismissed)) {
        window.localStorage.setItem(DISMISS_KEY, String(POCO_VERSION_CODE))
        return
      }
      if (POCO_VERSION_CODE > dismissed) {
        setSinceCode(dismissed)
        setOpen(true)
      }
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [onboardingComplete])

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, String(POCO_VERSION_CODE))
    }
    setOpen(false)
  }

  return (
    <PocoWhatsNewDialog
      open={open}
      onClose={handleClose}
      entries={getReleaseNotesAfter(sinceCode)}
    />
  )
}
