import { useEffect } from 'react'
import { HashRouter } from 'react-router-dom'
import { AppRoutes } from './routes/AppRoutes'
import { PwaUpdateToast } from './components/pwa/PwaUpdateToast'
import { isPwaDisplay } from './utils/notifyDelivery'

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
      <PwaUpdateToast />
      <PwaContextMenuGuard />
      <AppRoutes />
    </HashRouter>
  )
}
