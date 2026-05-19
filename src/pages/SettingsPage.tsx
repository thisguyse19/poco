import { useCallback, useRef, useState } from 'react'
import { PageHeader } from '../components/tasks/PageHeader'
import { PocoConfirmDialog } from '../components/ui/PocoConfirmDialog'
import { PocoMessageDialog } from '../components/ui/PocoMessageDialog'
import { PocoFocusMinutesCarousel } from '../components/ui/PocoFocusMinutesCarousel'
import { SettingsDevLab } from '../components/settings/SettingsDevLab'
import { AppearanceControlGroup } from '../components/settings/AppearanceControlGroup'
import { ScrumMasterEditModal } from '../components/settings/ScrumMasterEditModal'
import { useSettingsStore, DEFAULT_SETTINGS } from '../stores/settingsStore'
import { storage } from '../services/storage'
import { scrumPersonalityMeta } from '../utils/scrumMaster'
import { pocoDevLab } from '../utils/pocoDevLab'
import { triggerHaptic } from '../utils/haptics'
import { requestScrumNotificationPermission } from '../hooks/useScrumNotifications'
import { notificationSettingsHint } from '../utils/notifyDelivery'

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore()
  const [clearOpen, setClearOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [scrumModalOpen, setScrumModalOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const devLastRef = useRef(0)
  const devTapRef = useRef(0)

  const onSettingsTitleTap = useCallback(() => {
    const now = Date.now()
    const gap = now - devLastRef.current
    devLastRef.current = now
    devTapRef.current = gap > 4000 ? 1 : devTapRef.current + 1
    if (devTapRef.current >= 7) {
      pocoDevLab.unlock()
      triggerHaptic([12, 24, 12])
      devTapRef.current = 0
    }
  }, [])

  const onSubtitleLongPress = useCallback(() => {
    pocoDevLab.unlock()
    triggerHaptic([18, 32, 18])
  }, [])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(storage.exportAll(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `poco-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Record<string, unknown>
      storage.importAll({
        tasks: data.tasks as never,
        settings: data.settings as never,
        sessions: data.sessions as never,
      })
      window.location.reload()
    } catch {
      setMsg('The file could not be imported. Please check that it is valid poco JSON.')
      setMsgOpen(true)
    }
  }

  const rowClass =
    'flex items-center justify-between gap-3 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Settings"
        subtitle="Tune your profile, appearance, focus, and data."
        onTitleClick={onSettingsTitleTap}
        onSubtitleLongPress={onSubtitleLongPress}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--poco-mobile-nav-height)+1rem)] pt-2 md:px-6">
        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Profile</h3>
          <div className="rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
            <label htmlFor="settings-profile-name" className="block font-medium text-[var(--text-primary)]">
              Your name
            </label>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Used in the Tasks home greeting and on the desktop sidebar.
            </p>
            <input
              id="settings-profile-name"
              type="text"
              className="poco-input mt-3 w-full rounded-none border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2.5 text-sm"
              placeholder="Your name"
              autoComplete="name"
              enterKeyHint="done"
              value={settings.profileName}
              onChange={(e) => updateSettings({ profileName: e.target.value })}
            />
          </div>
        </section>

        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Appearance</h3>

          <AppearanceControlGroup
            theme={settings.theme}
            density={settings.density}
            fontScale={settings.fontScale}
            onChange={(p) => updateSettings(p)}
          />

          <label className={rowClass}>
            <span>Reduce motion</span>
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
            />
          </label>
          <label className={rowClass}>
            <span>OLED optimisation</span>
            <input
              type="checkbox"
              checked={settings.oledOptimisation}
              onChange={(e) => updateSettings({ oledOptimisation: e.target.checked })}
            />
          </label>
        </section>

        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Features</h3>
          <div className="flex items-center justify-between gap-3 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">Scrum Master</p>
              <p className="truncate text-xs text-[var(--text-tertiary)]">
                {settings.scrumMaster.enabled
                  ? `${settings.scrumMaster.name} · ${scrumPersonalityMeta(settings.scrumMaster.personality).title} · ${settings.scrumMaster.standUpTime} / ${settings.scrumMaster.standDownTime}`
                  : 'Off'}
              </p>
            </div>
            <button type="button" className="poco-press shrink-0 text-sm font-semibold text-[var(--accent)]" onClick={() => setScrumModalOpen(true)}>
              Edit
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="poco-press rounded-none border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-3 text-left text-sm font-semibold text-[var(--text-primary)]"
              onClick={() => void requestScrumNotificationPermission()}
            >
              <span className="block">Notifications</span>
              <span className="mt-1 block text-xs font-normal text-[var(--text-secondary)]">
                {notificationSettingsHint()}
              </span>
            </button>
            <button
              type="button"
              className="poco-press rounded-none border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-3 text-left text-sm font-semibold text-[var(--text-primary)]"
              onClick={() => updateSettings({ scrumMasterGateComplete: false })}
            >
              Show Scrum Master intro and setup again
            </button>
          </div>
        </section>

        <SettingsDevLab />

        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Focus</h3>
          <div className="flex min-h-[84px] flex-row items-stretch gap-3 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
            <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
              <span className="text-sm font-medium">Focus minutes</span>
              <p className="text-xs text-[var(--text-tertiary)]">Length of each focus phase (5–120).</p>
            </div>
            <PocoFocusMinutesCarousel
              variant="toolbar"
              minutes={settings.focusDurationMinutes}
              onChange={(m) => updateSettings({ focusDurationMinutes: m })}
            />
          </div>
          <label className={rowClass}>
            <span>Auto-start breaks</span>
            <input
              type="checkbox"
              checked={settings.autoStartBreaks}
              onChange={(e) => updateSettings({ autoStartBreaks: e.target.checked })}
            />
          </label>
          <label className={rowClass}>
            <span>Auto-start next focus</span>
            <input
              type="checkbox"
              checked={settings.autoStartNext}
              onChange={(e) => updateSettings({ autoStartNext: e.target.checked })}
            />
          </label>
          <label className={rowClass}>
            <span>Keep screen awake</span>
            <input
              type="checkbox"
              checked={settings.keepScreenAwake}
              onChange={(e) => updateSettings({ keepScreenAwake: e.target.checked })}
            />
          </label>
        </section>

        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Behaviour</h3>
          <label className={rowClass}>
            <span>Haptics</span>
            <input type="checkbox" checked={settings.haptics} onChange={(e) => updateSettings({ haptics: e.target.checked })} />
          </label>
          <label className={rowClass}>
            <span>Confirm before delete</span>
            <input
              type="checkbox"
              checked={settings.confirmDelete}
              onChange={(e) => updateSettings({ confirmDelete: e.target.checked })}
            />
          </label>
        </section>

        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Data</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="poco-press rounded-none border border-[var(--border-default)] px-4 py-2 text-sm font-semibold"
              onClick={exportJson}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="poco-press rounded-none border border-[var(--border-default)] px-4 py-2 text-sm font-semibold"
              onClick={() => fileRef.current?.click()}
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importJson(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="poco-press rounded-none border border-[var(--priority-high)]/50 px-4 py-2 text-sm font-semibold text-[var(--priority-high)]"
              onClick={() => setClearOpen(true)}
            >
              Clear all data
            </button>
          </div>
          <button
            type="button"
            className="poco-press text-xs font-semibold text-[var(--text-tertiary)] underline"
            onClick={() => setResetOpen(true)}
          >
            Reset settings only
          </button>
        </section>
      </div>

      <PocoConfirmDialog
        open={clearOpen}
        title="Clear all local data?"
        description="Tasks, sessions, and settings will be removed from this browser."
        confirmLabel="Clear everything"
        variant="danger"
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          storage.clearAll()
          storage.saveSettings({ ...DEFAULT_SETTINGS, onboardingComplete: true })
          setClearOpen(false)
          window.location.reload()
        }}
      />

      <PocoConfirmDialog
        open={resetOpen}
        title="Reset settings?"
        description="Tasks are not removed. Preferences return to defaults."
        confirmLabel="Reset"
        variant="danger"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetSettings()
          setResetOpen(false)
        }}
      />

      <PocoMessageDialog open={msgOpen} title="Import failed" message={msg} onClose={() => setMsgOpen(false)} />

      <ScrumMasterEditModal
        open={scrumModalOpen}
        onClose={() => setScrumModalOpen(false)}
        value={settings.scrumMaster}
        onSave={(sm) => updateSettings({ scrumMaster: sm })}
      />
    </div>
  )
}
