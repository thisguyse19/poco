import { useNavigate } from 'react-router-dom'
import { useSettingsStore, SM_GATE_PROMPT_VERSION } from '../../stores/settingsStore'
import { requestScrumNotificationPermission } from '../../hooks/useScrumNotifications'
import { PocoAnimatedCenterModal } from '../ui/PocoAnimatedCenterModal'

export function ScrumMasterIntroGate() {
  const navigate = useNavigate()
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const sm = useSettingsStore((s) => s.settings.scrumMaster)

  const onNotNow = () => {
    updateSettings({
      scrumMasterGateComplete: true,
      scrumMasterGatePromptVersion: SM_GATE_PROMPT_VERSION,
      scrumMaster: { ...sm, enabled: false },
    })
  }

  const onSetUp = () => {
    navigate('/scrum-master-setup')
  }

  const onReminders = () => {
    void requestScrumNotificationPermission()
  }

  return (
    <PocoAnimatedCenterModal open onBackdropClick={() => {}} panelMaxWidthClass="max-w-md">
      <div className="max-h-[min(88dvh,560px)] w-full overflow-y-auto rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 shadow-xl">
        <h2 className="font-serif text-2xl">Meet your Scrum Master</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          A local rhythm for stand up and stand down: gentle prompts, a dedicated space for daily commitments, and a calmer
          hand-off into focus time. Everything stays on this device.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Want to configure names, times, tone, and optional reminders? If you skip for now, Scrum Master stays off until
          you turn it on in Settings.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="poco-press rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--text-inverse)]"
            onClick={onSetUp}
          >
            Set up Scrum Master
          </button>
          <button
            type="button"
            className="poco-press rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"
            onClick={onReminders}
          >
            Allow reminders (optional)
          </button>
          <button
            type="button"
            className="poco-press py-2 text-sm font-semibold text-[var(--text-secondary)]"
            onClick={onNotNow}
          >
            Not now — keep Scrum Master off
          </button>
        </div>
      </div>
    </PocoAnimatedCenterModal>
  )
}
