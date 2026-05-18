import { useState } from 'react'
import { PocoBottomSheet } from '../ui/PocoBottomSheet'
import { pocoDialogTheme } from '../ui/pocoDialogTheme'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTaskStore } from '../../stores/taskStore'

export function ReviewModal() {
  const tasks = useTaskStore((s) => s.tasks)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const todayOpen = tasks.filter((t) => !t.completed && t.scheduledFor === 'today')
  const [sheetOpen, setSheetOpen] = useState(true)

  const dismiss = () => setSheetOpen(false)

  return (
    <PocoBottomSheet
      open={sheetOpen}
      onBackdropClick={dismiss}
      onExitComplete={() => {
        updateSettings({ reviewDismissedAt: new Date().toISOString() })
      }}
    >
      <div className="px-5 pb-6 pt-1 max-md:pb-[calc(var(--poco-mobile-nav-height)+1rem)]">
        <h2 className={pocoDialogTheme.title}>End of day</h2>
        <p className={pocoDialogTheme.description}>A quick look at what is still open for today.</p>
        <ul className="mt-3 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-[var(--text-secondary)]">
          {todayOpen.length === 0 ? <li>Nothing left on today&apos;s list. Well done.</li> : null}
          {todayOpen.map((t) => (
            <li key={t.id}>{t.title}</li>
          ))}
        </ul>
        <div className={pocoDialogTheme.actions}>
          <button type="button" className={pocoDialogTheme.btnAccent} onClick={dismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </PocoBottomSheet>
  )
}
