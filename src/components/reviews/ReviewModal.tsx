import { PocoModal } from '../ui/PocoModal'
import { pocoDialogTheme } from '../ui/pocoDialogTheme'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTaskStore } from '../../stores/taskStore'

export function ReviewModal() {
  const tasks = useTaskStore((s) => s.tasks)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const todayOpen = tasks.filter((t) => !t.completed && t.scheduledFor === 'today')

  const dismiss = () => {
    updateSettings({ reviewDismissedAt: new Date().toISOString() })
  }

  return (
    <PocoModal open align="bottom" clearBottomNavOnMobile onBackdropClick={dismiss}>
      <div className="relative z-[1] mx-auto w-full max-w-lg rounded-t-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 shadow-xl animate-slideUp">
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
    </PocoModal>
  )
}
