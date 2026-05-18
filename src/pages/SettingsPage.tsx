import { useRef, useState } from 'react'
import { PageHeader } from '../components/tasks/PageHeader'
import { PocoConfirmDialog } from '../components/ui/PocoConfirmDialog'
import { PocoMessageDialog } from '../components/ui/PocoMessageDialog'
import { useSettingsStore, DEFAULT_SETTINGS } from '../stores/settingsStore'
import { storage } from '../services/storage'
import type { DensityName, ThemeName } from '../types'

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore()
  const [clearOpen, setClearOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader title="Settings" subtitle="Tune appearance, focus, and data." />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--poco-mobile-nav-height)+1rem)] pt-2 md:px-6">
        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Appearance</h3>
          <div className="flex flex-wrap gap-2">
            {(['light', 'dark', 'shrouded'] as ThemeName[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`poco-press rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-semibold capitalize ${
                  settings.theme === t
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-elevated)]'
                }`}
                onClick={() => updateSettings({ theme: t })}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['compact', 'default', 'relaxed'] as DensityName[]).map((d) => (
              <button
                key={d}
                type="button"
                className={`poco-press rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-semibold capitalize ${
                  settings.density === d
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-elevated)]'
                }`}
                onClick={() => updateSettings({ density: d })}
              >
                {d}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
            <span>Reduce motion</span>
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
            <span>OLED optimisation</span>
            <input
              type="checkbox"
              checked={settings.oledOptimisation}
              onChange={(e) => updateSettings({ oledOptimisation: e.target.checked })}
            />
          </label>
        </section>

        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Focus</h3>
          <label className="block text-sm">
            Focus minutes
            <input
              type="number"
              min={5}
              max={120}
              className="poco-input mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm"
              value={settings.focusDurationMinutes}
              onChange={(e) => updateSettings({ focusDurationMinutes: Number(e.target.value) || 25 })}
            />
          </label>
          <label className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
            <span>Auto-start breaks</span>
            <input
              type="checkbox"
              checked={settings.autoStartBreaks}
              onChange={(e) => updateSettings({ autoStartBreaks: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
            <span>Auto-start next focus</span>
            <input
              type="checkbox"
              checked={settings.autoStartNext}
              onChange={(e) => updateSettings({ autoStartNext: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
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
          <label className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
            <span>Haptics</span>
            <input type="checkbox" checked={settings.haptics} onChange={(e) => updateSettings({ haptics: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
            <span>Confirm before delete</span>
            <input
              type="checkbox"
              checked={settings.confirmDelete}
              onChange={(e) => updateSettings({ confirmDelete: e.target.checked })}
            />
          </label>
          <label className="block text-sm">
            End-of-day review hour (0–23)
            <input
              type="number"
              min={0}
              max={23}
              className="poco-input mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm"
              value={settings.endOfDayReviewHour}
              onChange={(e) => updateSettings({ endOfDayReviewHour: Number(e.target.value) || 20 })}
            />
          </label>
        </section>

        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Data</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="poco-press rounded-[var(--radius-sm)] border border-[var(--border-default)] px-4 py-2 text-sm font-semibold" onClick={exportJson}>
              Export JSON
            </button>
            <button
              type="button"
              className="poco-press rounded-[var(--radius-sm)] border border-[var(--border-default)] px-4 py-2 text-sm font-semibold"
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
              className="poco-press rounded-[var(--radius-sm)] border border-[var(--priority-high)]/50 px-4 py-2 text-sm font-semibold text-[var(--priority-high)]"
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
    </div>
  )
}
