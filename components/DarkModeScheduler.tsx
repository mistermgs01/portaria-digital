'use client'

import { useEffect } from 'react'

function isDarkHour(): boolean {
  const h = new Date().getHours() // 0-23
  return h >= 19 || h < 6
}

export default function DarkModeScheduler() {
  useEffect(() => {
    function aplicar() {
      if (isDarkHour()) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    aplicar()

    // Verifica a cada minuto para pegar exatamente às 19:00 e 06:00
    const id = setInterval(aplicar, 60_000)
    return () => clearInterval(id)
  }, [])

  return null
}
