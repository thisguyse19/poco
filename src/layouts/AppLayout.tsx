import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { useLongPress } from '../hooks/useLongPress'
import { useSettingsStore } from '../stores/settingsStore'
import { useTimerStore } from '../stores/timerStore'
import { pocoDevLab } from '../utils/pocoDevLab'
import { triggerHaptic } from '../utils/haptics'
import { ScrumMasterIntroGate } from '../components/scrum/ScrumMasterIntroGate'

function navClass(active: boolean) {
  const base =
    'flex items-center gap-3 min-h-[2.75rem] px-3 py-2 rounded-none w-full transition-colors'
  return active
    ? `${base} bg-[var(--accent-soft)] text-[var(--accent)]`
    : `${base} text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]`
}

function DesktopSidebarItem({
  to,
  icon,
  label,
  end,
}: {
  to: string
  icon: ReactNode
  label: string
  end?: boolean
}) {
  return (
    <NavLink to={to} className={({ isActive }) => navClass(isActive)} end={end}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{label}</span>
    </NavLink>
  )
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const profileName = useSettingsStore((s) => s.settings.profileName)
  const scrumGateComplete = useSettingsStore((s) => s.settings.scrumMasterGateComplete)
  const timerRunning = useTimerStore((s) => s.isRunning)
  const hideNav = location.pathname === '/focus' && timerRunning

  const settingsTabLongPress = useLongPress(
    () => {
      pocoDevLab.unlock()
      triggerHaptic([22, 40, 22])
      if (location.pathname !== '/settings') navigate('/settings')
    },
    { ms: 900, slopPx: 20 },
  )

  const initial = profileName.trim().charAt(0).toUpperCase() || ''

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg-base)]">
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <aside
          className={`relative z-30 hidden w-52 shrink-0 flex-col overflow-y-auto border-r border-[var(--border-subtle)] px-3 py-6 transition-transform duration-200 md:flex md:gap-6 ${
            hideNav ? '-translate-x-full pointer-events-none opacity-0' : ''
          }`}
          aria-hidden={hideNav}
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-none bg-[var(--accent)]" aria-hidden />
            <span className="font-serif text-xl tracking-wide text-[var(--text-primary)]">poco</span>
          </div>
          <nav className="flex flex-col gap-1">
            <DesktopSidebarItem to="/" end icon={<Icon name="tasks" size={18} />} label="Tasks" />
            <DesktopSidebarItem to="/week" icon={<Icon name="calendar" size={18} />} label="Week" />
            <DesktopSidebarItem to="/focus" icon={<Icon name="focus" size={18} />} label="Focus" />
            <DesktopSidebarItem to="/settings" icon={<Icon name="settings" size={18} />} label="Settings" />
          </nav>
          <div className="mt-auto pt-6">
            {profileName.trim() ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-none bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                  {initial}
                </span>
                <span className="truncate font-medium">{profileName.trim()}</span>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>

      {typeof document !== 'undefined'
        ? createPortal(
            <nav
              className={`fixed inset-x-0 bottom-0 z-[var(--poco-z-mobile-nav)] border-t border-[var(--border-subtle)] bg-[var(--bg-base)] transition-transform duration-200 md:hidden ${
                hideNav ? 'translate-y-full pointer-events-none' : ''
              }`}
              aria-hidden={hideNav}
            >
              <div className="grid grid-cols-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `poco-nav-tab flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-wide ${
                      isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                    }`
                  }
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    <Icon name="tasks" size={18} />
                  </span>
                  Tasks
                </NavLink>
                <NavLink
                  to="/week"
                  className={({ isActive }) =>
                    `poco-nav-tab flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-wide ${
                      isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                    }`
                  }
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    <Icon name="calendar" size={18} />
                  </span>
                  Week
                </NavLink>
                <NavLink
                  to="/focus"
                  className={({ isActive }) =>
                    `poco-nav-tab flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-wide ${
                      isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                    }`
                  }
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    <Icon name="focus" size={18} />
                  </span>
                  Focus
                </NavLink>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `poco-nav-tab flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-wide ${
                      isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                    }`
                  }
                  onPointerDown={settingsTabLongPress.onPointerDown}
                  onPointerMove={settingsTabLongPress.onPointerMove}
                  onPointerUp={settingsTabLongPress.onPointerUp}
                  onPointerCancel={settingsTabLongPress.onPointerCancel}
                  onClick={settingsTabLongPress.onClick}
                  onContextMenu={settingsTabLongPress.onContextMenu}
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    <Icon name="settings" size={18} />
                  </span>
                  Settings
                </NavLink>
              </div>
            </nav>,
            document.body,
          )
        : null}

      {!scrumGateComplete ? <ScrumMasterIntroGate /> : null}
    </div>
  )
}
