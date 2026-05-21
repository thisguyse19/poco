const KEY = 'poco:dev-lab'

export type PocoDevLabState = {
  unlocked: boolean
  showTaskIds: boolean
  stressSeedActive: boolean
  /** Longest Prism pulse streak (full rounds cleared). */
  prismBestStreak: number
  /** Scrum “Slay R21” voice unlocked (Male gender toggle easter egg). */
  scrumSlayVoiceUnlocked: boolean
}

const defaultState: PocoDevLabState = {
  unlocked: false,
  showTaskIds: false,
  stressSeedActive: false,
  prismBestStreak: 0,
  scrumSlayVoiceUnlocked: false,
}

function read(): PocoDevLabState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaultState }
    const o = JSON.parse(raw) as Partial<PocoDevLabState>
    return {
      unlocked: Boolean(o.unlocked),
      showTaskIds: Boolean(o.showTaskIds),
      stressSeedActive: Boolean(o.stressSeedActive),
      prismBestStreak: typeof o.prismBestStreak === 'number' && Number.isFinite(o.prismBestStreak) ? Math.max(0, Math.floor(o.prismBestStreak)) : 0,
      scrumSlayVoiceUnlocked: Boolean(o.scrumSlayVoiceUnlocked),
    }
  } catch {
    return { ...defaultState }
  }
}

function write(next: PocoDevLabState) {
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('poco-dev-lab-changed', { detail: next }))
}

export const pocoDevLab = {
  get(): PocoDevLabState {
    return read()
  },
  /** Same as set({ unlocked: true }) — used by Settings title taps and long-press unlocks. */
  unlock() {
    write({ ...read(), unlocked: true })
  },
  set(patch: Partial<PocoDevLabState>) {
    write({ ...read(), ...patch })
  },
  subscribe(fn: (s: PocoDevLabState) => void) {
    const handler = () => fn(read())
    window.addEventListener('poco-dev-lab-changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('poco-dev-lab-changed', handler)
      window.removeEventListener('storage', handler)
    }
  },
}
