import { useCallback, useEffect, useRef, useState } from 'react'
import { pocoDevLab } from '../../utils/pocoDevLab'
import { triggerHaptic } from '../../utils/haptics'

const PADS = 4

function useReduceMotion() {
  return typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true'
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * Tiny Simon-style memory game: watch the pulse, repeat the pattern; one new tone each round.
 */
export function PrismPulseGame() {
  const reduceMotion = useReduceMotion()
  const toneMs = reduceMotion ? 100 : 280
  const gapMs = reduceMotion ? 35 : 130

  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const [sequence, setSequence] = useState<number[]>([])
  const [phase, setPhase] = useState<'idle' | 'show' | 'listen' | 'over'>('idle')
  const [highlight, setHighlight] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const inputRef = useRef(0)

  const runShow = useCallback(
    async (seq: number[]) => {
      setPhase('show')
      setHighlight(null)
      for (const tone of seq) {
        if (!alive.current) return
        setHighlight(tone)
        triggerHaptic(8)
        await delay(toneMs)
        if (!alive.current) return
        setHighlight(null)
        await delay(gapMs)
      }
      if (!alive.current) return
      inputRef.current = 0
      setPhase('listen')
      setHighlight(null)
    },
    [gapMs, toneMs],
  )

  const start = useCallback(() => {
    const first = Math.floor(Math.random() * PADS)
    setSequence([first])
    setStatus('Watch the pads, then tap them in the same order.')
    void runShow([first])
  }, [runShow])

  const onPad = useCallback(
    (i: number) => {
      if (phase !== 'listen') return
      const k = inputRef.current
      if (sequence[k] !== i) {
        setPhase('over')
        setHighlight(null)
        const prevBest = pocoDevLab.get().prismBestStreak
        const nextBest = Math.max(prevBest, k)
        pocoDevLab.set({ prismBestStreak: nextBest })
        setStatus(`Stopped after ${k} correct taps. Best full rounds: ${nextBest}.`)
        triggerHaptic([35, 35, 90])
        return
      }
      triggerHaptic(5)
      const nk = k + 1
      inputRef.current = nk
      if (nk === sequence.length) {
        const cleared = sequence.length
        const prevBest = pocoDevLab.get().prismBestStreak
        pocoDevLab.set({ prismBestStreak: Math.max(prevBest, cleared) })
        const next = [...sequence, Math.floor(Math.random() * PADS)]
        setSequence(next)
        setStatus(`Round ${cleared} cleared. One more tone joins the chain.`)
        void runShow(next)
      }
    },
    [phase, runShow, sequence],
  )

  const best = pocoDevLab.get().prismBestStreak

  return (
    <div className="rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-serif text-base text-[var(--text-primary)]">Prism pulse</h4>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Best rounds {best}
        </span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        A quiet pattern memory game. Each time you finish, the chain grows by one tone. There is no time limit, only your recall.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {Array.from({ length: PADS }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Tone ${i + 1}`}
            disabled={phase === 'show'}
            onClick={() => onPad(i)}
            className={`poco-press aspect-square min-h-[4.25rem] rounded-none border-2 text-xs font-semibold uppercase tracking-wide transition-[transform,background-color,border-color] duration-150 [transition-timing-function:var(--ease-ios)] ${
              highlight === i
                ? 'scale-[1.02] border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
            } ${phase === 'show' ? 'pointer-events-none opacity-70' : ''}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {status ? <p className="mb-2 text-xs text-[var(--text-secondary)]">{status}</p> : null}

      {phase === 'idle' || phase === 'over' ? (
        <button type="button" className="poco-press rounded-none border border-[var(--border-default)] px-3 py-2 text-xs font-semibold" onClick={start}>
          {phase === 'over' ? 'Play again' : 'Start pulse'}
        </button>
      ) : null}
    </div>
  )
}
