import { useCallback, useRef, useState } from 'react'
import { PageHeader } from '../components/tasks/PageHeader'
import { Icon } from '../components/ui/Icon'
import { PocoConfirmDialog } from '../components/ui/PocoConfirmDialog'
import { PocoMessageDialog } from '../components/ui/PocoMessageDialog'
import { PocoHourCarousel } from '../components/ui/PocoHourCarousel'
import { PocoFocusMinutesCarousel } from '../components/ui/PocoFocusMinutesCarousel'
import { SettingsDevLab } from '../components/settings/SettingsDevLab'
import { useSettingsStore, DEFAULT_SETTINGS } from '../stores/settingsStore'
import { storage } from '../services/storage'
import type { DensityName, FontScaleName, ThemeName } from '../types'
import { pocoDevLab } from '../utils/pocoDevLab'
import { triggerHaptic } from '../utils/haptics'

function themeIcon(t: ThemeName) {
  if (t === 'light') return <Icon name="sun" size={20} />
  if (t === 'dark') return <Icon name="moon" size={20} />
  return <Icon name="circle" size={20} />
}

function DensityPreview({ d }: { d: DensityName }) {
  const gap = d === 'compact' ? 'gap-0.5' : d === 'default' ? 'gap-1' : 'gap-1.5'
  const h = d === 'compact' ? 'h-0.5' : d === 'default' ? 'h-1' : 'h-1.5'
  return (
    <div className={`flex w-8 flex-col ${gap}`} aria-hidden>
      <span className={`w-full bg-current ${h}`} />
      <span className={`w-full bg-current ${h}`} />
      <span className={`w-full bg-current ${h}`} />
    </div>
  )
}

function FontPreview({ f }: { f: FontScaleName }) {
  const cls = f === 'sm' ? 'text-[10px]' : f === 'md' ? 'text-xs' : 'text-sm'
  return (
    <span className={`font-semibold uppercase tracking-wide ${cls}`} aria-hidden>
      Aa
    </span>
  )
}

const triBase =
  'poco-press flex h-11 min-h-[2.75rem] flex-row items-center justify-center gap-2 px-2 text-xs font-semibold capitalize transition-colors duration-200 [transition-timing-function:var(--ease-ios)]'

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore()
  const [clearOpen, setClearOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)
  const [msg, setMsg] = useState('')
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
        subtitle="Tune appearance, focus, and data."
        onTitleClick={onSettingsTitleTap}
        onSubtitleLongPress={onSubtitleLongPress}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--poco-mobile-nav-height)+1rem)] pt-2 md:px-6">
        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Appearance</h3>

          <div className="overflow-hidden rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div className="flex h-9 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
              <Icon name="sun" size={16} className="text-[var(--text-tertiary)]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Theme</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]">
              {(['light', 'dark', 'shrouded'] as ThemeName[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${triBase} ${
                    settings.theme === t ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                  }`}
                  onClick={() => updateSettings({ theme: t })}
                >
                  <span className="text-[var(--text-primary)]">{themeIcon(t)}</span>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div className="flex h-9 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
              <Icon name="tasks" size={16} className="text-[var(--text-tertiary)]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Compactness</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]">
              {(['compact', 'default', 'relaxed'] as DensityName[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`${triBase} ${
                    settings.density === d ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                  }`}
                  onClick={() => updateSettings({ density: d })}
                >
                  <span className="text-[var(--text-primary)]">
                    <DensityPreview d={d} />
                  </span>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div className="flex h-9 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Font size</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]">
              {(['sm', 'md', 'lg'] as FontScaleName[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`${triBase} ${
                    settings.fontScale === f ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                  }`}
                  onClick={() => updateSettings({ fontScale: f })}
                >
                  <span className="text-[var(--text-primary)]">
                    <FontPreview f={f} />
                  </span>
                  {f}
                </button>
              ))}
            </div>
          </div>

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

        <SettingsDevLab />

        <section className="mb-8 space-y-3">
          <h3 className="font-serif text-lg">Focus</h3>
          <div className="flex min-h-[72px] flex-row items-stretch gap-3 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
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
          <div className="flex min-h-[72px] flex-row items-stretch gap-3 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
            <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
              <span className="text-sm font-medium">End-of-day review time</span>
              <p className="text-xs text-[var(--text-tertiary)]">After this hour, the home review sheet may appear.</p>
            </div>
            <PocoHourCarousel
              variant="toolbar"
              hour0to23={settings.endOfDayReviewHour}
              onChange={(h) => updateSettings({ endOfDayReviewHour: h })}
            />
          </div>
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
    </div>
  )
}
