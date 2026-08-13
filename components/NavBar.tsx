'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, Users, Car, LogIn, LogOut, User, ShieldCheck, Archive } from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/', label: 'Moradores', icon: Users },
  { href: '/veiculos', label: 'Veículos', icon: Car },
  { href: '/acesso', label: 'Acesso', icon: LogIn },
  { href: '/autorizacoes', label: 'Autorizações', icon: ShieldCheck },
  { href: '/arquivo', label: 'Arquivo', icon: Archive },
]

type AuthUser = { id: string; username: string; displayName: string; role: string } | null

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<AuthUser>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.authorized) setUser(json.user) })
      .catch(() => {})
  }, [pathname])

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/login')
    router.refresh()
  }

  if (pathname === '/login') return null

  return (
    <header style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }} className="shadow-lg sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Building2 size={18} className="text-white" />
            </div>
            <span className="font-bold text-white tracking-tight hidden sm:block">Portaria Digital</span>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    active ? 'bg-white text-blue-700' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User + logout */}
          {user && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg">
                <User size={13} className="text-blue-200" />
                <span className="text-xs text-blue-100 font-semibold">{user.displayName}</span>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sair"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-blue-100 hover:bg-white/10 text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loggingOut
                  ? <span className="w-3.5 h-3.5 border-2 border-blue-200/30 border-t-blue-200 rounded-full animate-spin" />
                  : <LogOut size={15} />
                }
                <span className="hidden sm:inline text-xs">Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
