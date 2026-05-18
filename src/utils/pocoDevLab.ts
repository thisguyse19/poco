const KEY = 'poco:dev-lab'

export type PocoDevLabState = {
  unlocked: boolean
  showTaskIds: boolean
  stressSeedActive: boolean
}

const defaultState: PocoDevLabState = {
  unlocked: false,
  showTaskIds: false,
  stressSeedActive: false,
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
