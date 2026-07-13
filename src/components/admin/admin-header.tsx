'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LogOut,
  User,
  Users,
  Shield,
  Volume2,
  ChevronDown,
  Menu,
  X,
  Home,
  Settings,
  Megaphone,
  FileText,
  MailOpen,
  Palette
} from 'lucide-react'
import type { AdminUser } from '@/lib/admin-auth-supabase'

interface AdminHeaderProps {
  admin: AdminUser
}

// Chave interna `gerente` é enum no banco; na Attra o papel real é
// colaborador de marketing — só o rótulo exibido muda.
const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Marketing',
}

const roleIcons: Record<string, React.ReactNode> = {
  admin: <Shield className="w-4 h-4" />,
  gerente: <User className="w-4 h-4" />,
}

export function AdminHeader({ admin }: AdminHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

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

  const navItems = [
    {
      label: 'Sons de Motor',
      href: '/admin/engine-sounds',
      icon: <Volume2 className="w-4 h-4" />,
      allowedRoles: ['admin', 'gerente'],
    },
    {
      label: 'Blog',
      href: '/admin/blog',
      icon: <FileText className="w-4 h-4" />,
      allowedRoles: ['admin', 'gerente'],
    },
    {
      label: 'Newsletter',
      href: '/admin/newsletter/campaigns',
      icon: <MailOpen className="w-4 h-4" />,
      allowedRoles: ['admin'],
    },
    {
      label: 'Marketing',
      href: '/admin/marketing',
      icon: <Megaphone className="w-4 h-4" />,
      allowedRoles: ['admin', 'gerente'],
    },
    {
      label: 'Criativos',
      href: '/admin/gerador-criativos',
      icon: <Palette className="w-4 h-4" />,
      allowedRoles: ['admin', 'gerente'],
    },
    {
      label: 'Usuários',
      href: '/admin/usuarios',
      icon: <Users className="w-4 h-4" />,
      allowedRoles: ['admin'],
    },
    {
      label: 'Configurações',
      href: '/admin/settings',
      icon: <Settings className="w-4 h-4" />,
      allowedRoles: ['admin'],
    },
  ]

  const filteredNavItems = navItems.filter(item => 
    item.allowedRoles.includes(admin.role)
  )

  return (
    <header className="bg-background-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link 
              href="/admin/engine-sounds" 
              className="text-lg font-bold text-foreground flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="hidden sm:inline">Admin</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {filteredNavItems.map(item => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-foreground-secondary hover:text-foreground hover:bg-background'
                      }
                    `}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-4">
            {/* User Profile Badge */}
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-background rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${admin.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'}
                `}>
                  {roleIcons[admin.role]}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-foreground truncate max-w-[150px]">
                    {admin.name || admin.email.split('@')[0]}
                  </div>
                  <div className="text-xs text-foreground-secondary">
                    {roleLabels[admin.role]}
                  </div>
                </div>
              </div>
            </div>

            {/* Site Link */}
            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1 px-3 py-2 text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden lg:inline">Ver Site</span>
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>

            {/* Mobile Menu Button */}
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
            {/* User Info Mobile */}
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border mb-4">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${admin.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'}
              `}>
                {roleIcons[admin.role]}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {admin.name || admin.email}
                </div>
                <div className="text-xs text-foreground-secondary">
                  {roleLabels[admin.role]}
                </div>
              </div>
            </div>

            {/* Mobile Nav */}
            {filteredNavItems.map(item => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground-secondary hover:text-foreground hover:bg-background'
                    }
                  `}
                >
                  {item.icon}
                  {item.label}
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

