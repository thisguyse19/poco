import { useSettingsStore } from '../../stores/settingsStore'
import type { TimerMode } from '../../types'
import { Icon } from '../ui/Icon'

type Props = {
  mode: TimerMode
  isRunning: boolean
  progress: number
  formatted: string
  sessionsCompleted: number
  focusSessionsInCycle: number
  compact?: boolean
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
}

function modeLabel(mode: TimerMode) {
  if (mode === 'focus') return 'Focus'
  if (mode === 'shortBreak') return 'Short break'
  return 'Long break'
}

function modeTint(mode: TimerMode) {
  if (mode === 'focus') return 'var(--accent)'
  if (mode === 'shortBreak') return 'var(--priority-low)'
  return 'var(--pin-color)'
}

export function TimerControls({
  mode,
  isRunning,
  progress,
  formatted,
  sessionsCompleted,
  focusSessionsInCycle,
  compact,
  onToggle,
  onReset,
  onSkip,
}: Props) {
  const reduceMotion = useSettingsStore((s) => s.settings.reduceMotion)
  const ambient = useSettingsStore((s) => s.settings.ambientSound)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const tint = modeTint(mode)
  const ringClass = isRunning && !reduceMotion ? 'poco-timer-ring-running' : ''

  const r = 52
  const c = 2 * Math.PI * r
  const offset = c * (1 - progress)

  return (
    <div className="flex flex-col items-center gap-6 px-4">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${
              i <= focusSessionsInCycle && mode === 'focus'
                ? 'bg-[var(--accent)]'
                : 'bg-[var(--border-default)]'
            }`}
          />
        ))}
      </div>
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
        {modeLabel(mode)}
      </p>

      <div className="relative flex items-center justify-center">
        <div
          className={`pointer-events-none absolute inset-0 rounded-full blur-3xl ${isRunning && !reduceMotion ? 'poco-timer-glow-pulse' : ''}`}
          style={{
            background: `radial-gradient(circle, ${tint}55 0%, transparent 65%)`,
            opacity: isRunning ? 0.45 : 0.2,
          }}
        />
        <svg width="220" height="220" viewBox="0 0 140 140" className={`relative z-[1] ${ringClass}`}>
          <g transform="translate(70 70) rotate(-90) translate(-70 -70)">
            <circle cx="70" cy="70" r={r} stroke="var(--border-subtle)" strokeWidth="8" fill="none" />
            <circle
              className="poco-timer-progress"
              cx="70"
              cy="70"
              r={r}
              stroke={tint}
              strokeWidth="8"
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </g>
        </svg>
        <div
          className={`pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-center font-serif ${
            compact ? 'text-[2.5rem]' : 'text-[3.25rem]'
          } tracking-tight text-[var(--text-primary)]`}
        >
          {formatted}
        </div>
      </div>

      <div className="flex w-full max-w-xs items-center justify-between gap-4">
        <button type="button" className="poco-press text-[var(--text-secondary)]" aria-label="Reset" onClick={onReset}>
          <Icon name="circle" size={18} />
        </button>
        <button type="button" className="poco-press text-sm font-semibold text-[var(--accent)]" onClick={onSkip}>
          Skip
        </button>
        <button
          type="button"
          aria-label={isRunning ? 'Pause' : 'Start'}
          className="poco-press flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--accent)] text-[var(--text-inverse)] shadow-lg"
          onClick={onToggle}
        >
          {isRunning ? (
            <span className="flex gap-1">
              <span className="h-5 w-1 rounded-sm bg-current" />
              <span className="h-5 w-1 rounded-sm bg-current" />
            </span>
          ) : (
            <span className="ml-1 border-y-[10px] border-l-[16px] border-y-transparent border-l-current" />
          )}
        </button>
        <div className="text-right text-xs text-[var(--text-tertiary)]">
          <div className="font-semibold text-[var(--text-primary)]">{sessionsCompleted}</div>
          sessions
        </div>
      </div>

      {!compact ? (
        <div className="w-full max-w-xs">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Ambient
          </p>
          <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1">
            {(['off', 'rain', 'white', 'forest', 'cafe'] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={`poco-press flex-1 rounded-[var(--radius-sm)] px-2 py-2 text-[10px] font-semibold capitalize ${
                  ambient === a ? 'bg-[var(--bg-elevated)] text-[var(--accent)] shadow-sm' : 'text-[var(--text-secondary)]'
                }`}
                onClick={() => {
                  updateSettings({ ambientSound: a })
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
