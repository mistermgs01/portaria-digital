'use client'

import { useEffect } from 'react'

function isDarkHour(): boolean {
  const h = new Date().getHours() // 0-23
  return h >= 19 || h < 6
}

export default function DarkModeScheduler() {
  useEffect(() => {
    function aplicar() {
      const escuro = isDarkHour()
      const html = document.documentElement
      const body = document.body

      if (escuro) {
        html.classList.add('dark')
        html.style.backgroundColor = '#111827'
        body.style.backgroundColor = '#111827'
      } else {
        html.classList.remove('dark')
        html.style.backgroundColor = ''
        body.style.backgroundColor = ''
      }
    }

    aplicar()

    // Verifica a cada minuto para pegar exatamente às 19:00 e 06:00
    const id = setInterval(aplicar, 60_000)
    return () => clearInterval(id)
  }, [])

  return null
}
