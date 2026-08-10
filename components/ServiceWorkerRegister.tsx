'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('[PWA] Service worker registrado:', reg.scope))
        .catch(err => console.warn('[PWA] Falha ao registrar service worker:', err))
    }
  }, [])

  return null
}
