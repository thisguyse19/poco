import { Icon } from '../ui/Icon'
import type { DensityName, FontScaleName, ThemeName } from '../../types'

const triBase =
  'poco-press flex h-11 min-h-[2.75rem] flex-row items-center justify-center gap-2 px-2 text-xs font-semibold capitalize transition-colors duration-200 [transition-timing-function:var(--ease-ios)]'

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

type Props = {
  theme: ThemeName
  density: DensityName
  fontScale: FontScaleName
  onChange: (patch: { theme?: ThemeName; density?: DensityName; fontScale?: FontScaleName }) => void
}

/** Same segmented control blocks as Settings → Appearance */
export function AppearanceControlGroup({ theme, density, fontScale, onChange }: Props) {
  return (
    <div className="space-y-3">
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
              className={`${triBase} ${theme === t ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
              onClick={() => onChange({ theme: t })}
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
              className={`${triBase} ${density === d ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
              onClick={() => onChange({ density: d })}
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
              className={`${triBase} ${fontScale === f ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
              onClick={() => onChange({ fontScale: f })}
            >
              <span className="text-[var(--text-primary)]">
                <FontPreview f={f} />
              </span>
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
