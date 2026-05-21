import { useEffect } from 'react'
import { HashRouter } from 'react-router-dom'
import { AppRoutes } from './routes/AppRoutes'
import { PwaUpdateToast } from './components/pwa/PwaUpdateToast'
import { WhatsNewGate } from './components/pwa/WhatsNewGate'
import { isPwaDisplay } from './utils/notifyDelivery'
import { useTaskStore } from './stores/taskStore'

function ScheduleDayRollover() {
  useEffect(() => {
    const tick = () => {
      useTaskStore.getState().ensureScheduleDayRollover()
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return null
}

/** Installed PWA: block system context menu (long-press) at capture phase. */
function PwaContextMenuGuard() {
  useEffect(() => {
    if (!isPwaDisplay()) return
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    document.addEventListener('contextmenu', onContextMenu, { capture: true })
    return () => document.removeEventListener('contextmenu', onContextMenu, { capture: true })
  }, [])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <WhatsNewGate />
      <PwaUpdateToast />
      <PwaContextMenuGuard />
      <ScheduleDayRollover />
      <AppRoutes />
    </HashRouter>
  )
}
