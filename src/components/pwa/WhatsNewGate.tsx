import { useEffect, useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { getReleaseNotesAfter, POCO_VERSION_CODE } from '../../version'
import { POCO_SESSION_AFTER_SW_UPDATE } from '../../utils/pwaUpdate'
import { PocoWhatsNewDialog } from './PocoWhatsNewDialog'

const DISMISS_KEY = 'poco-version-notes-dismissed-code'

/**
 * After a deploy, if the running build is newer than the last "What is new" dismissal,
 * show release notes once. After a service-worker update reload, always show once (session flag).
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

      let afterSw = false
      try {
        afterSw = sessionStorage.getItem(POCO_SESSION_AFTER_SW_UPDATE) === '1'
        if (afterSw) sessionStorage.removeItem(POCO_SESSION_AFTER_SW_UPDATE)
      } catch {
        /* ignore */
      }

      if (afterSw) {
        const raw = window.localStorage.getItem(DISMISS_KEY)
        const dismissed =
          raw === null || raw === '' ? 0 : Number(raw)
        setSinceCode(Number.isFinite(dismissed) ? dismissed : 0)
        setOpen(true)
        return
      }

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
