import type { ReactNode } from 'react'
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
  /** Wider ring and typography on large screens (e.g. active focus session). */
  phaseExpansive?: boolean
  /** Rendered directly above the timer ring (e.g. task picker chip) */
  topSlot?: ReactNode
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
}

function modeLabel(mode: TimerMode) {
  if (mode === 'focus') return 'Focus'
  if (mode === 'shortBreak') return 'Short break'
  return 'Long break'
}

/** Stroke + glow accents per phase — uses theme tokens so light/dark stay coherent */
function phaseRing(mode: TimerMode): string {
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
  phaseExpansive,
  topSlot,
  onToggle,
  onReset,
  onSkip,
}: Props) {
  const reduceMotion = useSettingsStore((s) => s.settings.reduceMotion)
  const ambient = useSettingsStore((s) => s.settings.ambientSound)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const ring = phaseRing(mode)
  const ringClass = isRunning && !reduceMotion ? 'poco-timer-ring-running' : ''
  const ringGlow =
    isRunning && !reduceMotion
      ? `drop-shadow(0 0 2px color-mix(in srgb, ${ring} 55%, transparent)) drop-shadow(0 0 14px color-mix(in srgb, ${ring} 40%, transparent)) drop-shadow(0 0 28px color-mix(in srgb, ${ring} 22%, transparent))`
      : isRunning
        ? `drop-shadow(0 0 6px color-mix(in srgb, ${ring} 35%, transparent))`
        : undefined

  const r = 52
  const c = 2 * Math.PI * r
  const offset = c * (1 - progress)

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex gap-2.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => {
          const filled = i <= focusSessionsInCycle
          const current = filled && i === focusSessionsInCycle
          return (
            <span
              key={i}
              className={`h-2 w-2 rounded-none transition-[opacity,transform,box-shadow] duration-300 ${
                current && isRunning && !reduceMotion ? 'scale-110' : 'scale-100'
              }`}
              style={{
                background: filled ? ring : 'transparent',
                opacity: filled ? (current ? 1 : 0.82) : 0.38,
                boxShadow: filled ? `0 0 0 1px color-mix(in srgb, ${ring} 45%, transparent)` : `inset 0 0 0 1.5px color-mix(in srgb, ${ring} 38%, var(--border-default))`,
              }}
            />
          )
        })}
      </div>
      <p
        className="text-center text-xs font-semibold uppercase tracking-[0.2em] transition-colors duration-300"
        style={{ color: `color-mix(in srgb, ${ring} 52%, var(--text-tertiary))` }}
      >
        {modeLabel(mode)}
      </p>

      {topSlot ? <div className="w-full shrink-0 px-0">{topSlot}</div> : null}

      <div className="relative flex shrink-0 items-center justify-center">
        <div
          className={`pointer-events-none absolute inset-0 rounded-none blur-3xl ${isRunning && !reduceMotion ? 'poco-timer-glow-pulse' : ''}`}
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${ring} 50%, transparent) 0%, transparent 68%)`,
            opacity: isRunning ? 0.5 : 0.18,
          }}
        />
        <svg
          viewBox="0 0 140 140"
          className={`relative z-[1] aspect-square shrink-0 transition-[filter] duration-500 ${ringClass} ${
            phaseExpansive
              ? 'w-[min(88vw,260px)] max-w-[260px] md:w-[min(52vw,400px)] md:max-w-[400px]'
              : 'w-[min(88vw,220px)] max-w-[220px] md:max-w-[260px]'
          }`}
          aria-hidden
        >
          <g transform="translate(70 70) rotate(-90) translate(-70 -70)">
            <circle cx="70" cy="70" r={r} stroke="var(--border-subtle)" strokeWidth="8" fill="none" />
            <circle
              className="poco-timer-progress"
              cx="70"
              cy="70"
              r={r}
              stroke={ring}
              strokeWidth="8"
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ filter: ringGlow }}
            />
          </g>
        </svg>
        <div
          className={`pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-center font-serif ${
            compact
              ? 'text-[2.5rem]'
              : phaseExpansive
                ? 'text-[3.25rem] md:text-[4.25rem]'
                : 'text-[3.25rem]'
          } tracking-tight text-[var(--text-primary)]`}
        >
          {formatted}
        </div>
      </div>

      <div className="grid w-full max-w-md shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-1">
        <div className="flex min-w-0 items-center justify-start gap-3">
          <button type="button" className="poco-press shrink-0 text-[var(--text-secondary)]" aria-label="Reset" onClick={onReset}>
            <Icon name="circle" size={18} />
          </button>
          <button type="button" className="poco-press shrink-0 text-sm font-semibold text-[var(--accent)]" onClick={onSkip}>
            Skip
          </button>
        </div>
        <button
          type="button"
          aria-label={isRunning ? 'Pause' : 'Start'}
          className="poco-press flex h-[52px] w-[52px] shrink-0 items-center justify-center justify-self-center rounded-none bg-[var(--accent)] text-[var(--text-inverse)] shadow-lg"
          onClick={onToggle}
        >
          <span className="flex h-6 w-6 items-center justify-center">
            {isRunning ? (
              <span className="flex gap-1">
                <span className="h-5 w-1 rounded-none bg-current" />
                <span className="h-5 w-1 rounded-none bg-current" />
              </span>
            ) : (
              <span className="ml-0.5 border-y-[10px] border-l-[16px] border-y-transparent border-l-current" />
            )}
          </span>
        </button>
        <div className="min-w-0 justify-self-end text-right text-xs text-[var(--text-tertiary)]">
          <div className="font-semibold text-[var(--text-primary)]">{sessionsCompleted}</div>
          sessions
        </div>
      </div>

      {!compact ? (
        <div className="w-full max-w-md shrink-0">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Ambient
          </p>
          <div className="flex flex-wrap gap-1 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1">
            {(['off', 'rain', 'white', 'forest', 'cafe'] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={`poco-press flex-1 rounded-none px-2 py-2 text-[10px] font-semibold capitalize ${
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
