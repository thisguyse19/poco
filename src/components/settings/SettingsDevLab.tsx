import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Icon } from '../ui/Icon'
import { PocoMessageDialog } from '../ui/PocoMessageDialog'
import { pocoDevLab } from '../../utils/pocoDevLab'
import { storage } from '../../services/storage'
import { useTaskStore } from '../../stores/taskStore'
import { useTimerStore } from '../../stores/timerStore'

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'] as const

export function SettingsDevLab() {
  const [state, setState] = useState(() => pocoDevLab.get())
  const [msg, setMsg] = useState<string | null>(null)
  const addTask = useTaskStore((s) => s.addTask)
  /** Plain object selector must be shallow-stable for React 19 + useSyncExternalStore (see Settings page crash). */
  const timerSnap = useTimerStore(
    useShallow((s) => ({
      mode: s.mode,
      isRunning: s.isRunning,
      remainingMs: s.remainingMs,
      currentTaskId: s.currentTaskId,
    })),
  )

  useEffect(() => {
    const unsub = pocoDevLab.subscribe(() => setState(pocoDevLab.get()))
    return unsub
  }, [])

  const konamiRef = useRef(0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!pocoDevLab.get().unlocked) return
      const want = KONAMI[konamiRef.current]
      const ok = e.key === want || e.key.toLowerCase() === String(want)
      if (ok) {
        konamiRef.current += 1
        if (konamiRef.current >= KONAMI.length) {
          konamiRef.current = 0
          setMsg('Konami sequence acknowledged. Nothing else unlocks—this is a calm app—but you earned the ribbon.')
        }
      } else {
        konamiRef.current = 0
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const bytes = useMemo(() => {
    let n = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      const v = localStorage.getItem(k) ?? ''
      n += k.length + v.length
    }
    return n
  }, [])

  const copyDebug = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      dev: pocoDevLab.get(),
      tasks: storage.getTasks().length,
      settingsKeys: Object.keys(storage.getSettings()),
      approxBytes: bytes,
      timer: storage.getTimer(),
      timerLive: timerSnap,
    }
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setMsg('Debug snapshot copied to the clipboard.')
  }, [bytes, timerSnap])

  const seedStress = () => {
    const titles = [
      'Edge case: tomorrow @high',
      'Unicode check — café résumé',
      'NLP torture for @work on 31 Dec at 11.59pm',
      'Empty category fallback',
    ]
    for (const title of titles) {
      addTask({
        title,
        category: 'Lab',
        dueDate: null,
        dueTime: null,
        scheduledFor: 'today',
        priority: 'medium',
      })
    }
    pocoDevLab.set({ stressSeedActive: true })
    setMsg('Seeded four lab tasks and enabled stress-prefix mode for new quick-add titles.')
  }

  const clearStress = () => {
    pocoDevLab.set({ stressSeedActive: false })
    setMsg('Stress-prefix mode off. Delete lab tasks manually if you like.')
  }

  if (!state.unlocked) return null

  return (
    <section className="mb-8 space-y-3 border border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)]/30 p-3">
      <div className="flex items-center gap-2">
        <Icon name="tasks" size={18} className="text-[var(--accent)]" />
        <h3 className="font-serif text-lg text-[var(--accent)]">Developer lab</h3>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        Hidden panel for curious builders. Nothing here leaves your device. Konami works only while this panel is visible.
      </p>

      <div className="rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-secondary)]">
        <span className="font-semibold text-[var(--text-primary)]">Storage footprint (approx):</span> {bytes.toLocaleString()} characters across{' '}
        {localStorage.length} keys.
      </div>

      <div className="rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-[10px] leading-relaxed text-[var(--text-secondary)]">
        <div className="mb-1 font-sans text-xs font-semibold text-[var(--text-primary)]">Timer snapshot</div>
        {JSON.stringify(timerSnap, null, 1)}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="poco-press rounded-none border border-[var(--border-default)] px-3 py-2 text-xs font-semibold" onClick={copyDebug}>
          Copy debug snapshot
        </button>
        <button type="button" className="poco-press rounded-none border border-[var(--border-default)] px-3 py-2 text-xs font-semibold" onClick={seedStress}>
          Seed stress tasks
        </button>
        <button type="button" className="poco-press rounded-none border border-[var(--border-default)] px-3 py-2 text-xs font-semibold" onClick={clearStress}>
          Clear stress mode
        </button>
        <button
          type="button"
          className="poco-press rounded-none border border-[var(--border-default)] px-3 py-2 text-xs font-semibold"
          onClick={() => {
            void navigator.clipboard.writeText(`${window.innerWidth}×${window.innerHeight}`)
            setMsg('Viewport size copied.')
          }}
        >
          Copy viewport
        </button>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm">
        <span>Show task IDs in list</span>
        <input
          type="checkbox"
          checked={state.showTaskIds}
          onChange={(e) => {
            pocoDevLab.set({ showTaskIds: e.target.checked })
            setState(pocoDevLab.get())
          }}
        />
      </label>

      <button
        type="button"
        className="poco-press w-full rounded-none border border-[var(--priority-high)]/40 py-2 text-xs font-semibold text-[var(--priority-high)]"
        onClick={() => {
          pocoDevLab.set({ unlocked: false, showTaskIds: false, stressSeedActive: false })
          setState(pocoDevLab.get())
        }}
      >
        Lock lab &amp; reset flags
      </button>

      <PocoMessageDialog open={Boolean(msg)} title="Lab" message={msg ?? ''} onClose={() => setMsg(null)} />
    </section>
  )
}
