import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

window.addEventListener('load', () => {
  navigator.serviceWorker.register('/poco/sw.js').catch(() => {})
})
