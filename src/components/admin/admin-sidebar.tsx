'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ExternalLink, LayoutGrid, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { AdminUser } from '@/lib/admin-auth-supabase'
import { GRUPOS, secaoAtiva, sectionsForRole } from '@/lib/admin-sections'
import { ROLE_LABELS, isAdminRole, type AdminRole } from '@/lib/auth/roles'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

/** Cookie que guarda a barra recolhida, para o servidor já desenhar no estado certo. */
export const COOKIE_LATERAL = 'attra_admin_lateral'

/**
 * Barra lateral do admin (14/11/2026).
 *
 * No computador o admin não tinha menu: para trocar de seção era preciso
 * voltar à tela inicial de cards. A barra fica sempre à vista, com as seções
 * que a pessoa pode abrir, nos mesmos grupos da tela inicial, e marca onde
 * ela está. No celular quem faz esse papel é o cabeçalho (admin-header.tsx).
 */
export function AdminSidebar({ admin, recolhidaInicial }: { admin: AdminUser; recolhidaInicial: boolean }) {
  const [recolhida, setRecolhida] = useState(recolhidaInicial)
  const [saindo, setSaindo] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const role: AdminRole = isAdminRole(admin.role) ? admin.role : 'gerente'
  const secoes = sectionsForRole(role, admin.secoes)
  const nome = admin.name || admin.email.split('@')[0]

  const alternar = () => {
    const nova = !recolhida
    setRecolhida(nova)
    document.cookie = `${COOKIE_LATERAL}=${nova ? '1' : '0'}; path=/admin; max-age=31536000; samesite=lax`
  }

  const sair = async () => {
    setSaindo(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } finally {
      setSaindo(false)
    }
  }

  const item = (href: string, rotulo: string, Icon: typeof LayoutGrid, ativo: boolean) => (
    <Link
      key={href}
      href={href}
      title={recolhida ? rotulo : undefined}
      aria-current={ativo ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] font-medium transition-colors',
        recolhida && 'justify-center px-0',
        ativo
          ? 'bg-primary/10 text-primary'
          : 'text-foreground-secondary hover:bg-background hover:text-foreground',
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!recolhida && <span className="truncate">{rotulo}</span>}
    </Link>
  )

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-background-card lg:flex',
        recolhida ? 'w-16' : 'w-64',
      )}
      aria-label="Menu do painel"
    >
      <div className={cn('flex h-16 shrink-0 items-center border-b border-border px-3', recolhida ? 'justify-center' : 'justify-between')}>
        {!recolhida && (
          <Link href="/admin" className="flex items-center gap-2 font-bold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">A</span>
            Attra
          </Link>
        )}
        <button
          type="button"
          onClick={alternar}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-background hover:text-foreground"
          aria-label={recolhida ? 'Abrir o menu' : 'Recolher o menu'}
          title={recolhida ? 'Abrir o menu' : 'Recolher o menu'}
        >
          {recolhida ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {item('/admin', 'Início', LayoutGrid, pathname === '/admin')}
        {GRUPOS.map(grupo => {
          const doGrupo = secoes.filter(s => s.grupo === grupo.id)
          if (doGrupo.length === 0) return null
          return (
            <div key={grupo.id} className="mt-4">
              {recolhida ? (
                <div className="mx-3 mb-2 border-t border-border" />
              ) : (
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
                  {grupo.titulo}
                </div>
              )}
              <div className="space-y-0.5">
                {doGrupo.map(s => item(s.href, s.label, s.Icon, secaoAtiva(s, pathname)))}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-2">
        {!recolhida && (
          <div className="px-3 pb-2 pt-1">
            <div className="truncate text-sm font-medium text-foreground">{nome}</div>
            <div className="text-xs text-foreground-secondary">{ROLE_LABELS[role]}</div>
          </div>
        )}
        <div className={cn('flex items-center gap-1', recolhida && 'flex-col')}>
          <ThemeToggle className="flex h-10 w-10 items-center justify-center" />
          <Link
            href="/"
            target="_blank"
            title="Ver o site"
            aria-label="Ver o site"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-background hover:text-foreground"
          >
            <ExternalLink className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            title="Sair"
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50',
              recolhida ? 'w-10 px-0' : 'ml-auto',
            )}
          >
            <LogOut className="h-5 w-5" />
            {!recolhida && 'Sair'}
          </button>
        </div>
      </div>
    </aside>
  )
}
