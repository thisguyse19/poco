/** True when the app is likely running as an installed PWA (not a normal browser tab). */
export function isPwaDisplay(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches
    const minimal = window.matchMedia('(display-mode: minimal-ui)').matches
    const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    return standalone || fullscreen || minimal || iosStandalone
  } catch {
    return false
  }
}

/** Short copy for the Settings / setup notifications row. */
export function notificationSettingsHint(): string {
  if (isPwaDisplay()) {
    return 'Stand up and stand down use installed-app notifications when the system allows them.'
  }
  return 'Stand up and stand down use this browser’s notification permission while poco runs in a tab.'
}

function notificationIconUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const base = import.meta.env.BASE_URL
  const path = `${base.replace(/\/?$/, '/')}poco/icons/icon-192.png`
  return new URL(path, window.location.origin).href
}

async function showViaServiceWorker(title: string, options: { body: string; tag: string; silent?: boolean }): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  const icon = notificationIconUrl()
  const notifOpts: NotificationOptions = {
    body: options.body,
    tag: options.tag,
    silent: options.silent ?? false,
    ...(icon ? { icon, badge: icon } : {}),
  }
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(title, notifOpts)
    return true
  } catch {
    /* continue */
  }
  try {
    const reg = await navigator.serviceWorker.ready
    const worker = reg.active ?? reg.waiting
    if (!worker) return false
    worker.postMessage({
      type: 'poco-show-notification',
      title,
      body: options.body,
      tag: options.tag,
      silent: options.silent ?? false,
      icon,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Shows a local notification. Prefer the window `Notification` constructor first so alerts appear
 * while the app is in the foreground (especially in installed PWAs, where SW-only delivery is easy
 * to miss). Fall back to the service worker when the page cannot show a notification.
 */
export async function deliverLocalNotification(
  title: string,
  options: { body: string; tag: string; silent?: boolean },
): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission !== 'granted') return false

  const icon = notificationIconUrl()
  const notifOpts: NotificationOptions = {
    body: options.body,
    tag: options.tag,
    silent: options.silent ?? false,
    ...(icon ? { icon, badge: icon } : {}),
  }

  try {
    new Notification(title, notifOpts)
    return true
  } catch {
    /* e.g. insecure context or policy blocks page notifications */
  }

  if ('serviceWorker' in navigator) {
    return showViaServiceWorker(title, options)
  }
  return false
}
