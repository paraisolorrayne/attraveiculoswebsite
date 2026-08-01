'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, User, Shield, LayoutGrid, Menu, X, Home } from 'lucide-react'
import type { AdminUser } from '@/lib/admin-auth-supabase'
import { sectionsForRole } from '@/lib/admin-sections'
import { isAdminRole, type AdminRole } from '@/lib/auth/roles'

interface AdminHeaderProps {
  admin: AdminUser
}

const roleLabels: Record<AdminRole, string> = {
  admin: 'Administrador',
  owner: 'Owner',
  operador: 'Operador',
  marketing: 'Marketing',
  gerente: 'Gerente',
}

const HIGH_ROLES: AdminRole[] = ['admin', 'owner']

export function AdminHeader({ admin }: AdminHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const role: AdminRole = isAdminRole(admin.role) ? admin.role : 'gerente'
  const sections = sectionsForRole(role, admin.secoes)
  const isHigh = HIGH_ROLES.includes(role)
  const onHome = pathname === '/admin'

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="bg-background-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + voltar ao painel */}
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-lg font-bold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="hidden sm:inline">Admin</span>
            </Link>

            {!onHome && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-background transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                Painel
              </Link>
            )}
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-background rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isHigh ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'}`}>
                  {isHigh ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-foreground truncate max-w-[150px]">
                    {admin.name || admin.email.split('@')[0]}
                  </div>
                  <div className="text-xs text-foreground-secondary">{roleLabels[role]}</div>
                </div>
              </div>
            </div>

            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1 px-3 py-2 text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden lg:inline">Ver Site</span>
            </Link>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-foreground-secondary hover:text-foreground"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-border bg-background-card">
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isHigh ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'}`}>
                {isHigh ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{admin.name || admin.email}</div>
                <div className="text-xs text-foreground-secondary">{roleLabels[role]}</div>
              </div>
            </div>

            <Link
              href="/admin"
              onClick={() => setShowMobileMenu(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${onHome ? 'bg-primary/10 text-primary' : 'text-foreground-secondary hover:text-foreground hover:bg-background'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              Painel
            </Link>

            {sections.map(({ label, href, Icon }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground-secondary hover:text-foreground hover:bg-background'}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}

            <Link
              href="/"
              target="_blank"
              onClick={() => setShowMobileMenu(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-foreground-secondary hover:text-foreground rounded-lg hover:bg-background transition-colors"
            >
              <Home className="w-4 h-4" />
              Ver Site
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
